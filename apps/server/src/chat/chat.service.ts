import { Injectable } from '@nestjs/common'
import { z } from 'zod'

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

export const chatRequestSchema = z.object({
  msgId: z.string(),
  conversationId: z.string(),
  query: z.string().min(1).max(8000),
  isEditedQuery: z.boolean().optional().default(false),
  system: z.string().optional(),
  modelConfig: modelConfigSchema.optional(),
  multiMedias: z.array(z.any()).optional().default([]),
})

export type ChatRequest = z.infer<typeof chatRequestSchema>

const DEFAULT_MODEL_CONFIG = {
  model: 'deepseek-v4-pro',
  enableThinking: false,
  webSearchStatus: 'disabled' as const,
  maxTokens: 2048,
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
  choices?: Array<{ delta?: { content?: string } }>
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

/**
 * ChatService — 封装 LLM API 调用，返回异步生成器。
 *
 * 产出 `{ type, content }` 事件，对齐SSE 格式。
 */
@Injectable()
export class ChatService {
  /**
   * 向 LLM 发起流式请求，返回 AsyncGenerator 逐 token 产出。
   *
   * 产出事件类型：
   * - `{ type: 'text', content: string }` — 消息 token
   * - `{ type: 'error', content: string }` — 错误信息
   * - `{ type: 'usage', promptTokens, completionTokens, totalTokens }` — token 用量
   * - `{ type: 'done' }` — 结束
   */
  async *streamChat(body: ChatRequest): AsyncGenerator<Record<string, unknown>> {
    const { query, system, modelConfig: rawMc } = body
    const mc = { ...DEFAULT_MODEL_CONFIG, ...rawMc }

    // 拼接系统提示词
    const mergedSystem = system
      ? `${MD_FORMAT_SYSTEM_PROMPT}\n\n---\n\n${system}`
      : MD_FORMAT_SYSTEM_PROMPT

    let llmRes: Response
    try {
      llmRes = await fetch(LLM_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${LLM_API_KEY}`,
        },
        body: JSON.stringify({
          model: mc.model,
          messages: [
            { role: 'system', content: mergedSystem },
            { role: 'user', content: query },
          ],
          max_tokens: mc.maxTokens,
          ...(mc.temperature !== undefined ? { temperature: mc.temperature } : {}),
          stream: true,
        }),
      })
    } catch (err) {
      yield { type: 'error', content: `LLM API unreachable: ${(err as Error).message}` }
      return
    }

    if (!llmRes.ok) {
      const errText = await llmRes.text().catch(() => '')
      console.error(`[chat] LLM API error ${llmRes.status}:`, errText)
      yield { type: 'error', content: `LLM API error ${llmRes.status}` }
      return
    }

    // 管道：字节流 → 文本流 → 消费
    const reader = llmRes.body!
      .pipeThrough(new TextDecoderStream())
      .getReader()

    let usageInfo: Record<string, number> | null = null

    // 缓冲：攒够 50 字符或 40ms 再吐一次，减少 SSE 事件数量
    let buffer = ''
    let lastFlushTime = Date.now()
    const FLUSH_CHAR_THRESHOLD = 50
    const FLUSH_TIME_THRESHOLD = 40

    /** 满足任一条件即应吐出 */
    const shouldFlush = (): boolean =>
      buffer.length >= FLUSH_CHAR_THRESHOLD || Date.now() - lastFlushTime >= FLUSH_TIME_THRESHOLD

    /** 吐出缓冲内容（清空 + 重置计时器） */
    const tryFlush = function* (): Generator<{ type: string; content: string }> {
      if (buffer.length > 0) {
        yield { type: 'text', content: buffer }
        buffer = ''
        lastFlushTime = Date.now()
      }
    }

    /**
     * 跨 chunk 行缓冲：LLM SSE 行可能被拆到两个相邻的 read() chunk 中，
     * 需要在 chunk 间保留未完成的行，等下一个 chunk 到来后拼接完整再解析。
     */
    let lineBuffer = ''

    /** 处理完整的一行 SSE 数据 */
    const processLine = function* (line: string): Generator<Record<string, unknown>> {
      if (!line.startsWith('data: ')) return
      const raw = line.slice(6).trim()
      if (raw === '[DONE]') {
        yield* tryFlush()
        yield { type: 'done' }
        return
      }

      try {
        const chunk: LLMChunk = JSON.parse(raw)
        const token = chunk.choices?.[0]?.delta?.content
        if (token) {
          buffer += token
          if (shouldFlush()) {
            yield* tryFlush()
          }
        }

        // 捕获 usage（deepseek 在最后返回）
        if (chunk.usage) {
          usageInfo = {
            promptTokens: chunk.usage.prompt_tokens,
            completionTokens: chunk.usage.completion_tokens,
            totalTokens: chunk.usage.total_tokens,
          }
        }
      } catch { /* skip */ }
    }

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        if (!value) continue

        // 将本次 chunk 拼接到跨 chunk 行缓冲，然后按换行切分
        lineBuffer += value
        const lines = lineBuffer.split('\n')

        // 最后一段可能是未完整的行，留到下次 chunk 拼接
        lineBuffer = lines.pop() ?? ''

        for (const line of lines) {
          const result = processLine(line.trimEnd())
          for (const evt of result) {
            if (evt.type === 'done') {
              yield evt
              return
            }
            yield evt
          }
        }

        // 每个 chunk 结束时若已积攒够时间，也吐出
        yield* tryFlush()
      }

      // 流结束后处理残留行缓冲（不含换行的最后一行）
      if (lineBuffer.trim()) {
        const result = processLine(lineBuffer.trimEnd())
        for (const evt of result) {
          yield evt
        }
      }
    } catch { /* stream interrupted */ }

    // 兜底：吐出残留 + usage + done
    yield* tryFlush()
    if (usageInfo) {
      yield { type: 'usage', ...usageInfo as Record<string, unknown> }
    }
    yield { type: 'done' }
  }
}
