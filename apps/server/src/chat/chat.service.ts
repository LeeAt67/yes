import { Injectable } from '@nestjs/common'
import { createLogger } from '../lib/logger'
import { z } from 'zod'
import { WebSearchService } from './web-search.service'

const logger = createLogger('chat:service')

// ── LLM API 配置 ──
const LLM_API_URL = process.env.LLM_API_URL!
const LLM_API_KEY = process.env.LLM_API_KEY!

// ── Schema ──

export const modelConfigSchema = z.object({
  model: z.string().optional(),
  enableThinking: z.boolean().optional(),
  webSearchStatus: z.enum(['disabled', 'enabled']).optional(),
  maxTokens: z.number().min(1).max(16000).optional(),
  temperature: z.number().min(0).max(2).optional(),
})

export type ModelConfig = z.infer<typeof modelConfigSchema>

export const historyMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
})

export type HistoryMessage = z.infer<typeof historyMessageSchema>

/** 多模态附件输入 */
export const multiMediaSchema = z.object({
  mediaType: z.enum(['image', 'file', 'video', 'audio']),
  url: z.string().optional(),
  name: z.string().optional(),
  size: z.number().optional(),
})

export type MultiMediaInput = z.infer<typeof multiMediaSchema>

export const chatRequestSchema = z.object({
  msgId: z.string(),
  conversationId: z.string(),
  query: z.string().min(1).max(8000),
  isEditedQuery: z.boolean().optional().default(false),
  system: z.string().optional(),
  modelConfig: modelConfigSchema.optional(),
  multiMedias: z.array(multiMediaSchema).optional().default([]),
  history: z.array(historyMessageSchema).optional().default([]),
})

export type ChatRequest = z.infer<typeof chatRequestSchema>

const DEFAULT_MODEL_CONFIG: ModelConfig = {
  model: 'deepseek-v4-pro',
  enableThinking: false,
  webSearchStatus: 'disabled',
  maxTokens: 2048,
}

/**
 * 上下文窗口预算（token 数）。
 *
 * deepseek-v4-pro 支持 128K 上下文，预留 20% 给 prompt + 搜索 + 输出，
 * 历史消息最多占用 80% = ~102K tokens。
 */
const MAX_CONTEXT_TOKENS = 102400

/** 达到此比例自动触发 compact（摘要压缩） */
const COMPACT_THRESHOLD = 0.7

/** compact 后保留最近 N 条原始消息 */
const COMPACT_KEEP_RECENT = 6

/** 粗略估算文本 token 数：中文 ≈ 字数，英文 ≈ 词数 × 1.3 */
const estimateTokens = (text: string): number => {
  let count = 0
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i)
    if (code < 128) {
      // ASCII 字符：约 0.25 token/char
      count += 0.25
    } else {
      // CJK / 其他多字节字符：约 1 token/char
      count += 1
    }
  }
  return Math.ceil(count)
}

/**
 * 滑动窗口截断历史消息，确保总 token 数不超过预算。
 *
 * 策略：保留最近的消息，从最早的消息开始丢弃。
 * 保留 system + 当前 query 的空间，截图（包括搜索上下文）留给调用方自行控制。
 *
 * @param history - 原始历史消息列表
 * @param budget - token 预算上限
 * @returns 截断后的历史 + 丢弃的消息数
 */
const truncateHistory = (
  history: Array<{ role: string; content: string }>,
  budget: number,
): { truncated: Array<{ role: string; content: string }>; dropped: number } => {
  const total = history.reduce((sum, m) => sum + estimateTokens(m.content), 0)
  if (total <= budget) return { truncated: history, dropped: 0 }

  // 从最早开始丢，保留最近
  let remaining = budget
  const kept: Array<{ role: string; content: string }> = []
  for (let i = history.length - 1; i >= 0; i--) {
    const cost = estimateTokens(history[i].content)
    if (cost <= remaining) {
      kept.unshift(history[i])
      remaining -= cost
    } else {
      // 超出预算，停止保留
      return { truncated: kept, dropped: i + 1 }
    }
  }
  return { truncated: kept, dropped: 0 }
}

/** 规范模型 Markdown 输出的系统提示词，每次请求自动附带 */
const MD_FORMAT_SYSTEM_PROMPT = `输出 Markdown 内容时，请严格遵守以下规则：

1. 数学公式：行内用单个 $...$ 包裹，块级单独一行用 $$...$$ 包裹。禁止在普通文本或代码中使用 $ 符号。
2. 代码块：用三个反引号围栏，标注语言，如 \`\`\`python ... \`\`\`。代码内部禁止出现 $ 符号。
3. LaTeX 语法：花括号必须成对，如 \\frac{1}{2}、\\sqrt{x}、\\int_{0}^{1}。
4. 标题：用 ## 或 ###，禁止用 #。
5. 列表、表格：用标准 GFM 语法。`

// ── LLM chunk ──
interface LLMChunk {
  choices?: Array<{
    delta?: {
      content?: string
      tool_calls?: Array<{
        index?: number
        id?: string
        function?: { name?: string; arguments?: string }
      }>
    }
    finish_reason?: string
  }>
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

/** OpenAI function-calling 工具定义 */
interface ToolDefinition {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: {
      type: 'object'
      properties: Record<string, unknown>
      required?: string[]
    }
  }
}

/** 累积的 tool_call 中间状态 */
interface PendingToolCall {
  id: string
  name: string
  arguments: string
}

/**
 * ChatService — 封装 LLM API 调用，返回异步生成器。
 *
 * 支持 LLM 驱动的 tool calling：当启用 webSearch 时，
 * 将工具定义传给 LLM，LLM 自主决定是否调用 web_search。
 * 若调用则执行搜索、回传结果、继续对话循环。
 *
 * 产出 `{ type, content }` 事件，对齐 SSE 格式。
 */
@Injectable()
export class ChatService {
  constructor(private readonly webSearchService: WebSearchService) {}

  /**
   * 调用 LLM 对早期对话生成摘要，用于自动 compact。
   *
   * 使用非流式调用，快速返回摘要文本。
   *
   * @param messages - 需要摘要的消息列表
   * @returns 摘要文本；失败时返回空字符串
   */
  private compactHistory = async (
    messages: Array<{ role: string; content: string }>,
  ): Promise<string> => {
    if (messages.length === 0) return ''

    const conversationText = messages
      .map((m) => `${m.role === 'user' ? '用户' : 'AI'}：${m.content}`)
      .join('\n\n')

    try {
      const res = await fetch(LLM_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${LLM_API_KEY}`,
        },
        body: JSON.stringify({
          model: DEFAULT_MODEL_CONFIG.model ?? 'deepseek-v4-pro',
          messages: [
            {
              role: 'system',
              content:
                '你是一个对话摘要助手。请用不超过 500 字的中文简洁摘要以下对话的关键信息，包括：用户问了什么、AI 回答了什么关键内容、用户提供了哪些重要信息。只输出摘要文本，不要用 Markdown 标题格式。',
            },
            { role: 'user', content: `请摘要以下对话：\n\n${conversationText}` },
          ],
          max_tokens: 1024,
          temperature: 0.3,
          stream: false,
        }),
      })

      if (!res.ok) {
        logger.warn('compact 摘要请求失败:', res.status)
        return ''
      }

      const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> }
      const summary = data.choices?.[0]?.message?.content ?? ''
      logger.info(`compact 完成：${messages.length} 条消息 → ${summary.length} 字摘要`)
      return summary
    } catch (err) {
      logger.warn('compact 摘要调用失败:', (err as Error).message)
      return ''
    }
  }

  /**
   * 构建 OpenAI 格式的工具定义列表。
   *
   * 当 webSearchStatus !== 'enabled' 时返回空数组，LLM 不会调用工具。
   */
  private getTools = (mc: ModelConfig): ToolDefinition[] => {
    if (mc.webSearchStatus !== 'enabled' || !this.webSearchService.available) return []

    return [
      {
        type: 'function',
        function: {
          name: 'web_search',
          description: '搜索互联网获取实时信息。当用户询问需要最新数据的问题时（新闻、天气、股价、赛事等），调用此工具获取搜索结果，然后基于结果回答。',
          parameters: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: '搜索关键词，用中文或英文均可',
              },
            },
            required: ['query'],
          },
        },
      },
    ]
  }

  /**
   * 执行 LLM 请求的工具调用。
   *
   * @param name - 工具名称
   * @param args - 工具参数
   * @returns 工具执行结果（JSON 字符串）或错误信息
   */
  private executeTool = async (name: string, args: Record<string, unknown>): Promise<string> => {
    if (name === 'web_search') {
      const query = String(args.query ?? '')
      if (!query) return '错误：缺少搜索关键词'

      const results = await this.webSearchService.search(query)
      if (results.length === 0) return '未找到相关结果'
      return JSON.stringify(results)
    }

    return `未知工具：${name}`
  }

  /**
   * 向 LLM 发起流式请求，返回 AsyncGenerator 逐 token 产出。
   *
   * 当 webSearchStatus === 'enabled' 时，将工具定义传给 LLM，
   * LLM 自主决定是否调用 web_search 工具。
   *
   * 产出事件类型：
   * - `{ type: 'tool_call', name, arguments }` — LLM 请求调用工具
   * - `{ type: 'tool_result', name, result }` — 工具执行结果
   * - `{ type: 'text', content: string }` — 消息 token
   * - `{ type: 'error', content: string }` — 错误信息
   * - `{ type: 'usage', promptTokens, completionTokens, totalTokens }` — token 用量
   * - `{ type: 'done' }` — 结束
   */
  async *streamChat(body: ChatRequest): AsyncGenerator<Record<string, unknown>> {
    const { query, system, modelConfig: rawMc, history, multiMedias } = body
    const mc = { ...DEFAULT_MODEL_CONFIG, ...rawMc }

    // 拼接系统提示词（不含搜索结果，搜索由 LLM tool_call 驱动）
    const mergedSystem = system
      ? `${MD_FORMAT_SYSTEM_PROMPT}\n\n---\n\n${system}`
      : MD_FORMAT_SYSTEM_PROMPT

    // 构建当前用户消息的多模态 content
    const userContent = buildMultimodalContent(query, multiMedias ?? [])

    // ── 构建初始 messages（compact + 截断） ──
    const buildMessages = async (extraMessages: Array<Record<string, unknown>> = []): Promise<Array<Record<string, unknown>>> => {
      const systemTokens = estimateTokens(mergedSystem)
      const queryTokens = estimateTokens(query)
      const historyBudget = MAX_CONTEXT_TOKENS - systemTokens - queryTokens - (mc.maxTokens ?? 2048)

      let compactSummary = ''
      let processedHistory = history as Array<{ role: string; content: string }>

      const histTokens = processedHistory.reduce((s, m) => s + estimateTokens(m.content), 0)
      if (histTokens > MAX_CONTEXT_TOKENS * COMPACT_THRESHOLD && processedHistory.length > COMPACT_KEEP_RECENT) {
        logger.info(`触发 compact：历史 ${processedHistory.length} 条 / ~${histTokens} tokens`)
        const toSummarize = processedHistory.slice(0, -COMPACT_KEEP_RECENT)
        const recent = processedHistory.slice(-COMPACT_KEEP_RECENT)
        compactSummary = await this.compactHistory(toSummarize)
        processedHistory = recent
      }

      let budget = historyBudget - estimateTokens(
        extraMessages.map(m => String(m.content ?? '')).join(''),
      )
      if (compactSummary) budget -= estimateTokens(compactSummary)

      const { truncated, dropped } = truncateHistory(processedHistory, Math.max(0, budget))
      if (dropped > 0 || compactSummary) {
        logger.info(`上下文管理：compact=${compactSummary.length > 0}，截断 ${dropped} 条 → 最终 ${truncated.length} 条`)
      }

      const msgs: Array<Record<string, unknown>> = [
        { role: 'system', content: mergedSystem },
      ]
      if (compactSummary) {
        msgs.push({ role: 'system', content: `[更早的对话摘要]\n${compactSummary}` })
      }
      // 历史消息仅传文本（不含 base64 图片数据，体积太大）
      for (const h of truncated) msgs.push({ role: h.role, content: h.content })
      for (const m of extraMessages) msgs.push(m)
      // 当前用户消息使用多模态格式
      msgs.push({ role: 'user', content: userContent })

      return msgs
    }

    const tools = this.getTools(mc)

    // ── 主循环：支持多轮 tool calling ──
    // 前 MAX_TOOL_ROUNDS-2 轮传 tools，最后 2 轮不传强制 LLM 输出文本
    const MAX_TOOL_ROUNDS = 5
    const extraMessages: Array<Record<string, unknown>> = []

    for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
      const llmMessages = await buildMessages(extraMessages)

      // 倒数第 2 轮起不传 tools，强制 LLM 基于已有结果生成最终回答
      const currentTools = round < MAX_TOOL_ROUNDS - 1 ? tools : []
      let llmRes: Response
      try {
        llmRes = await fetch(LLM_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${LLM_API_KEY}`,
          },
          body: JSON.stringify({
            model: mc.model ?? 'deepseek-v4-pro',
            messages: llmMessages,
            max_tokens: mc.maxTokens ?? 2048,
            ...(mc.temperature !== undefined ? { temperature: mc.temperature } : {}),
            ...(currentTools.length > 0 ? { tools: currentTools } : {}),
            stream: true,
          }),
        })
      } catch (err) {
        yield { type: 'error', content: `LLM API unreachable: ${(err as Error).message}` }
        return
      }

      if (!llmRes.ok) {
        const errText = await llmRes.text().catch(() => '')
        logger.error(`LLM API error ${llmRes.status}:`, errText)
        yield { type: 'error', content: `LLM API error ${llmRes.status}` }
        return
      }

      // 流式消费，同时累积 tool_calls + 文本
      const reader = llmRes.body!.pipeThrough(new TextDecoderStream()).getReader()

      // tool_call 累积状态
      const pendingCalls: PendingToolCall[] = []
      let usageInfo: Record<string, number> | null = null
      let finishReason = ''
      let hasContent = false

      // 文本缓冲
      let buffer = ''
      let lastFlushTime = Date.now()
      const FLUSH_CHAR_THRESHOLD = 50
      const FLUSH_TIME_THRESHOLD = 40
      const shouldFlush = (): boolean =>
        buffer.length >= FLUSH_CHAR_THRESHOLD || Date.now() - lastFlushTime >= FLUSH_TIME_THRESHOLD
      const tryFlush = function* (): Generator<Record<string, unknown>> {
        if (buffer.length > 0) {
          yield { type: 'text', content: buffer }
          buffer = ''
          lastFlushTime = Date.now()
        }
      }

      let lineBuffer = ''

      const processLine = function* (line: string): Generator<Record<string, unknown>> {
        if (!line.startsWith('data: ')) return
        const raw = line.slice(6).trim()
        if (raw === '[DONE]') {
          yield* tryFlush()
          return
        }

        try {
          const chunk: LLMChunk = JSON.parse(raw)
          const delta = chunk.choices?.[0]?.delta
          const finish = chunk.choices?.[0]?.finish_reason

          if (finish) finishReason = finish

          // 捕获 tool_calls
          if (delta?.tool_calls) {
            for (const tc of delta.tool_calls) {
              const idx = tc.index ?? 0
              if (!pendingCalls[idx]) {
                pendingCalls[idx] = { id: tc.id ?? '', name: '', arguments: '' }
              }
              if (tc.id) pendingCalls[idx].id = tc.id
              if (tc.function?.name) pendingCalls[idx].name += tc.function.name
              if (tc.function?.arguments) pendingCalls[idx].arguments += tc.function.arguments
            }
          }

          // 捕获文本
          const token = delta?.content
          if (token) {
            hasContent = true
            buffer += token
            if (shouldFlush()) yield* tryFlush()
          }

          if (chunk.usage) {
            usageInfo = {
              promptTokens: chunk.usage.prompt_tokens,
              completionTokens: chunk.usage.completion_tokens,
              totalTokens: chunk.usage.total_tokens,
            }
          }
        } catch { /* skip */ }
      }

      // 消费 SSE 流
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          if (!value) continue

          lineBuffer += value
          const lines = lineBuffer.split('\n')
          lineBuffer = lines.pop() ?? ''

          for (const ln of lines) {
            for (const evt of processLine(ln.trimEnd())) {
              if (evt.type === 'done') { yield evt; return }
              yield evt
            }
          }
        }

        if (lineBuffer.trim()) {
          for (const evt of processLine(lineBuffer.trimEnd())) yield evt
        }

        yield* tryFlush()
      } catch { /* stream interrupted */ }

      // ── 判断结果 ──
      if (finishReason === 'tool_calls' && pendingCalls.length > 0 && round < MAX_TOOL_ROUNDS) {
        // LLM 要调用工具 → 执行 + 回传结果
        for (const pc of pendingCalls) {
          if (!pc.name) continue
          let parsedArgs: Record<string, unknown> = {}
          try { parsedArgs = JSON.parse(pc.arguments || '{}') } catch { /* keep empty */ }

          // ① 通知前端：tool_call（LLM 决定调用工具）
          yield { type: 'tool_call', name: pc.name, arguments: parsedArgs }

          // ② 通知前端：tool_progress（开始执行，前端可显示"搜索中…"等）
          yield { type: 'tool_progress', name: pc.name, message: `正在执行 ${pc.name}…` }

          // ③ 执行工具
          const startTime = Date.now()
          const result = await this.executeTool(pc.name, parsedArgs)
          const elapsed = Date.now() - startTime
          logger.info(`工具 ${pc.name} 执行完成，耗时 ${elapsed}ms`)

          // ④ 通知前端：tool_result
          yield { type: 'tool_result', name: pc.name, result }

          // 追加到 extraMessages，使用标准 OpenAI tool calling 格式
          // DeepSeek 要求 assistant 消息带 tool_calls 数组 + tool 消息带 tool_call_id
          extraMessages.push({
            role: 'assistant',
            content: null as unknown as string,
            tool_calls: [
              {
                id: pc.id,
                type: 'function',
                function: { name: pc.name, arguments: pc.arguments },
              },
            ],
          })
          extraMessages.push({
            role: 'tool',
            tool_call_id: pc.id,
            content: result,
          })
        }

        // 继续循环 → LLM 收到工具结果后给出最终回答
        continue
      }

      // 最终回答（finishReason === 'stop' 或超过轮数）
      yield* tryFlush()
      if (usageInfo) {
        yield { type: 'usage', ...usageInfo as Record<string, unknown> }
      }
      yield { type: 'done' }
      return
    }

    // 超过最大轮数兜底
    yield { type: 'error', content: '工具调用超过最大轮数' }
  }
}

/**
 * 构建多模态用户消息的 content 字段。
 *
 * 无图片/文件时返回纯文本字符串；有图片时返回 OpenAI multimodal 数组：
 * `[{ type: 'text', text }, { type: 'image_url', image_url: { url: 'data:...' } }, ...]`
 *
 * 支持的图片格式：data:image/* base64 或 http(s) URL。
 *
 * @param text - 用户文本
 * @param medias - 附件列表
 * @returns 文本字符串或多模态内容数组
 */
const buildMultimodalContent = (
  text: string,
  medias: Array<{ mediaType: string; url?: string; name?: string }>,
): string | Array<Record<string, unknown>> => {
  const images = medias.filter(
    (m) => m.mediaType === 'image' && m.url && /^(data:image\/|https?:\/\/)/i.test(m.url),
  )

  if (images.length === 0) return text

  const parts: Array<Record<string, unknown>> = [{ type: 'text', text }]
  for (const img of images) {
    parts.push({
      type: 'image_url',
      image_url: { url: img.url },
    })
  }
  return parts
}
