/**
 * 多协议消息规范化引擎。
 *
 * 通过适配器模式统一处理 Claw 原生、OpenAI（Chat Completions）、
 * Anthropic（Messages）三种 LLM 协议的历史消息格式，输出统一结构。
 *
 * 用法：
 *   import { normalizeHistoryMessages } from '@yes/shared'
 *   const messages = normalizeHistoryMessages(rawServerMessages)
 *   // messages: NormalizedMessage[] 可直接用于渲染或转存
 *
 * 设计思路：
 *   每个原始消息只包含一种协议的元数据；规范化器通过特征字段自动识别格式，
 *   路由到对应的适配器函数，生成统一格式的 NormalizedMessage。
 */

import { createLogger } from './logger'

const logger = createLogger('shared:message-normalizer')

// ============================================================
// 类型定义
// ============================================================

/**
 * 规范化后的工具调用条目。
 * 无论来源是 OpenAI tool_calls、Anthropic tool_use 还是 Claw 原生 toolCall，
 * 最终都统一为此结构。
 */
export interface NormalizedToolCall {
  /** 工具调用唯一标识符（映射自 tool_call_id / tool_use_id / toolCall.id） */
  id: string
  /** 工具名称 */
  name: string
  /** 工具参数（已 JSON.parse 后的对象） */
  args?: unknown
  /** 工具执行结果文本 */
  output?: string
  /** 是否为错误结果 */
  isError?: boolean
}

/**
 * 规范化后的单条消息。
 *
 * - `user` / `assistant` / `system`：纯文本消息
 * - `toolcall`：助手发起的工具调用请求（携带 toolCalls 数组）
 * - `toolresult`：工具执行结果（通过 toolCallId 关联到对应的 toolcall）
 */
export interface NormalizedMessage {
  /** 消息唯一 ID（自动生成） */
  id: string
  /** 消息角色 */
  role: 'user' | 'assistant' | 'system' | 'toolcall' | 'toolresult'
  /** 纯文本内容 */
  content: string
  /** 消息时间戳（毫秒） */
  timestamp: number
  /**
   * 仅 role === 'toolcall' 时存在，为本次助手消息中发起的所有工具调用。
   * 按原始数组顺序排列。
   */
  toolCalls?: NormalizedToolCall[]
  /**
   * 仅 role === 'toolresult' 时存在，
   * 关联到对应的 toolcall 消息的 toolCalls[].id。
   */
  toolCallId?: string
  /** 思考过程（来自 Claw thinking / Anthropic thinking 块），可选 */
  thinking?: string
}

// ============================================================
// 原始消息类型（各协议原始格式的松散类型）
// ============================================================

/** 各协议 content 数组中的通用条目 */
interface RawContentBlock {
  type?: string
  text?: string
  // --- Claw 原生 ---
  thinking?: string
  id?: string
  name?: string
  input?: unknown
  args?: unknown
  toolCallId?: string
  // --- Anthropic ---
  tool_use_id?: string
  content?: string | RawContentBlock[]
  // --- OpenAI ---
  image_url?: { url: string }
}

/** 原始消息 — 支持 Claw / OpenAI / Anthropic 及纯字符串格式 */
export interface RawMessage {
  role?: string
  text?: string
  content?: string | RawContentBlock[]
  timestamp?: number
  /** OpenAI: assistant 消息顶层 tool_calls 数组 */
  tool_calls?: Array<{
    id?: string
    type?: string
    function?: {
      name?: string
      arguments?: string
    }
  }>
  /** Claw / Anthropic: 驼峰命名变体 */
  toolCalls?: unknown[]
  /** OpenAI: tool 角色消息的关联 tool_call_id */
  tool_call_id?: string
  /** Claw 原生: toolResult 消息关联的工具调用 id */
  toolCallId?: string
  /** Claw 原生: toolResult 消息的工具名称 */
  toolName?: string
}

// ============================================================
// 内容提取工具
// ============================================================

/** 从文本 content block 列表中提取纯文本，跳过 tool/thinking 条目 */
/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
const extractTextFromContent = (content: any[]): string =>
  content
    .filter((item) => {
      const t = String(item?.type ?? '').toLowerCase()
      return !['thinking', 'toolcall', 'tool_use', 'function_call', 'image_url'].includes(t)
    })
    .map((item) => {
      const t = String(item?.type ?? '').toLowerCase()
      if (t === 'text' && typeof item.text === 'string') return item.text
      if (t === 'image' || t === 'image_url') return '[图片]'
      return ''
    })
    .filter(Boolean)
    .join('\n')

/** 从 rawMessage 中提取主文本内容（优先 text 字段，其次 content 字段） */
const extractMessageText = (msg: RawMessage): string => {
  if (typeof msg.text === 'string') return msg.text
  if (typeof msg.content === 'string') return msg.content
  if (Array.isArray(msg.content)) return extractTextFromContent(msg.content)
  return ''
}

/** 从 content 数组中提取 thinking 内容 */
/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
const extractThinkingFromContent = (content: any[]): string =>
  content
    .filter((item) => String(item?.type).toLowerCase() === 'thinking')
    .map((item) => (typeof item.thinking === 'string' ? item.thinking : ''))
    .filter(Boolean)
    .join('\n')

// ============================================================
// 适配器：各协议格式 → NormalizedMessage[]
// ============================================================

/**
 * Claw 原生格式适配器。
 *
 * 特征：content 数组中存在 type === 'toolCall' 或 type === 'toolResult'，
 * 或 role === 'toolresult'。
 *
 * @param msg - 原始消息
 * @param index - 消息在列表中的索引
 * @returns 规范化后的消息数组
 */
const adaptClawNative = (msg: RawMessage, index: number): NormalizedMessage[] => {
  const roleRaw = String(msg.role ?? '').toLowerCase()
  const ts = msg.timestamp ?? 0
  const result: NormalizedMessage[] = []

  // 情况 1a：role === 'toolresult'（独立的工具结果消息）
  if (roleRaw === 'toolresult') {
    const content = Array.isArray(msg.content) ? extractTextFromContent(msg.content) : ''
    const id = String(msg.toolCallId ?? msg.tool_call_id ?? `claw-tool-${index}`)
    result.push({
      id: `msg-${index}-tr`,
      role: 'toolresult',
      content,
      timestamp: ts,
      toolCallId: id,
      thinking: '',
    })
    return result
  }

  // 情况 1b：content 数组内嵌 toolCall / toolResult
  if (Array.isArray(msg.content)) {
    const thinking = extractThinkingFromContent(msg.content)
    const toolCalls: NormalizedToolCall[] = []
    const toolResults: NormalizedMessage[] = []

    for (let i = 0; i < msg.content.length; i++) {
      const block = msg.content[i] as RawContentBlock
      const blockType = String(block.type ?? '').toLowerCase()

      if (blockType === 'toolcall') {
        toolCalls.push({
          id: String(block.id ?? `claw-tc-${index}-${i}`),
          name: String(block.name ?? 'tool'),
          args: block.input ?? block.args,
        })
      } else if (blockType === 'toolresult') {
        const output =
          typeof block.content === 'string'
            ? block.content
            : Array.isArray(block.content)
              ? block.content
                  .map((c) => {
                    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
                    const ci = c as any
                    return typeof ci.text === 'string' ? ci.text : JSON.stringify(c)
                  })
                  .join('\n')
              : undefined
        toolResults.push({
          id: `msg-${index}-tr-${i}`,
          role: 'toolresult',
          content: output ?? '',
          timestamp: ts,
          toolCallId: String(block.toolCallId ?? block.tool_use_id ?? `claw-tr-${index}-${i}`),
          thinking: '',
        })
      }
    }

    const text = extractMessageText(msg)
    const assistantContent = extractTextFromContent(msg.content)

    // 如果同时有 toolCall 和文本，先输出 assistant 文本，再输出 toolcall
    if (assistantContent.trim()) {
      result.push({
        id: `msg-${index}-a`,
        role: 'assistant',
        content: assistantContent,
        timestamp: ts,
        thinking,
      })
    }

    if (toolCalls.length > 0) {
      result.push({
        id: `msg-${index}-tc`,
        role: 'toolcall',
        content: '',
        timestamp: ts,
        toolCalls,
        thinking: '',
      })
    }

    result.push(...toolResults)
    return result
  }

  // 情况 1c：普通消息（无 content 数组）
  return adaptPlain(msg, index)
}

/**
 * OpenAI Chat Completions 格式适配器。
 *
 * 特征：msg.tool_calls 数组存在，或 role === 'tool' / 'function'。
 *
 * @param msg - 原始消息
 * @param index - 消息在列表中的索引
 * @returns 规范化后的消息数组
 */
const adaptOpenAI = (msg: RawMessage, index: number): NormalizedMessage[] => {
  const roleRaw = String(msg.role ?? '').toLowerCase()
  const ts = msg.timestamp ?? 0
  const result: NormalizedMessage[] = []
  const thinking = Array.isArray(msg.content)
    ? extractThinkingFromContent(msg.content)
    : ''

  // 情况 2a：role === 'tool' 或 'function'（工具执行结果）
  if (roleRaw === 'tool' || roleRaw === 'function') {
    const output = typeof msg.text === 'string' ? msg.text : extractMessageText(msg)
    result.push({
      id: `msg-${index}-tr`,
      role: 'toolresult',
      content: output,
      timestamp: ts,
      toolCallId: String(msg.tool_call_id ?? `openai-tool-${index}`),
      thinking: '',
    })
    return result
  }

  // 情况 2b：assistant 消息携带顶层 tool_calls 数组
  const rawToolCalls = msg.tool_calls ?? msg.toolCalls
  if (Array.isArray(rawToolCalls) && rawToolCalls.length > 0) {
    const text = extractMessageText(msg)

    // 先输出文本部分（如果有）
    if (text.trim()) {
      result.push({
        id: `msg-${index}-a`,
        role: roleRaw === 'user' ? 'user' : roleRaw === 'system' ? 'system' : 'assistant',
        content: text,
        timestamp: ts,
        thinking,
      })
    }

    // 输出工具调用
    const toolCalls: NormalizedToolCall[] = rawToolCalls.map((tc, i) => {
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      const t = tc as any
      const fn = t.function
      let args: unknown
      if (fn?.arguments !== undefined) {
        try {
          args = typeof fn.arguments === 'string' ? JSON.parse(fn.arguments) : fn.arguments
        } catch {
          args = fn.arguments
        }
      } else {
        args = t.args ?? t.input
      }
      return {
        id: String(t.id ?? `openai-tc-${index}-${i}`),
        name: String(fn?.name ?? t.name ?? 'tool'),
        args,
      }
    })

    result.push({
      id: `msg-${index}-tc`,
      role: 'toolcall',
      content: '',
      timestamp: ts,
      toolCalls,
      thinking: '',
    })
    return result
  }

  // 情况 2c：content 为数组（如 vision 格式的 [{type:'text', text:'...'}, {type:'image_url', ...}]）
  if (Array.isArray(msg.content)) {
    const text = extractMessageText(msg)
    result.push({
      id: `msg-${index}`,
      role: roleRaw === 'user' ? 'user' : roleRaw === 'system' ? 'system' : 'assistant',
      content: text,
      timestamp: ts,
      thinking,
    })
    return result
  }

  // 情况 2d：普通消息回退
  return adaptPlain(msg, index)
}

/**
 * Anthropic Messages 格式适配器。
 *
 * 特征：content 数组中存在 type === 'tool_use' 或 type === 'tool_result'。
 *
 * @param msg - 原始消息
 * @param index - 消息在列表中的索引
 * @returns 规范化后的消息数组
 */
const adaptAnthropic = (msg: RawMessage, index: number): NormalizedMessage[] => {
  const roleRaw = String(msg.role ?? '').toLowerCase()
  const ts = msg.timestamp ?? 0

  if (!Array.isArray(msg.content)) {
    return adaptPlain(msg, index)
  }

  const result: NormalizedMessage[] = []
  const thinking = extractThinkingFromContent(msg.content)

  // 分离 tool_use 和 tool_result 块，以及普通文本块
  const toolUses: RawContentBlock[] = []
  const toolResults: RawContentBlock[] = []
  const textBlocks: RawContentBlock[] = []

  for (const block of msg.content) {
    const blockType = String(block.type ?? '').toLowerCase()
    if (blockType === 'tool_use') {
      toolUses.push(block)
    } else if (blockType === 'tool_result') {
      toolResults.push(block)
    } else if (blockType !== 'thinking') {
      textBlocks.push(block)
    }
  }

  // 输出文本部分
  if (textBlocks.length > 0) {
    const text = extractTextFromContent(textBlocks)
    if (text.trim()) {
      result.push({
        id: `msg-${index}-a`,
        role: roleRaw === 'user' ? 'user' : roleRaw === 'system' ? 'system' : 'assistant',
        content: text,
        timestamp: ts,
        thinking,
      })
    }
  }

  // 输出 tool_use 作为 toolcall 消息
  if (toolUses.length > 0) {
    const toolCalls: NormalizedToolCall[] = toolUses.map((tu, i) => ({
      id: String(tu.id ?? `anth-tu-${index}-${i}`),
      name: String(tu.name ?? 'tool'),
      args: tu.input,
    }))
    result.push({
      id: `msg-${index}-tc`,
      role: 'toolcall',
      content: '',
      timestamp: ts,
      toolCalls,
      thinking: '',
    })
  }

  // 输出 tool_result 作为独立 toolresult 消息
  for (let i = 0; i < toolResults.length; i++) {
    const tr = toolResults[i]
    const output =
      typeof tr.content === 'string'
        ? tr.content
        : Array.isArray(tr.content)
          ? tr.content
              .map((c) => {
                /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
                const ci = c as any
                return typeof ci.text === 'string' ? ci.text : JSON.stringify(c)
              })
              .join('\n')
          : ''
    result.push({
      id: `msg-${index}-tr-${i}`,
      role: 'toolresult',
      content: output,
      timestamp: ts,
      toolCallId: String(tr.tool_use_id ?? `anth-tr-${index}-${i}`),
      thinking: '',
    })
  }

  return result
}

/**
 * 纯文本格式适配器（兜底方案）。
 *
 * 适用于 content 为字符串或仅有 role 的简单消息结构。
 *
 * @param msg - 原始消息
 * @param index - 消息在列表中的索引
 * @returns 规范化后的消息数组
 */
const adaptPlain = (msg: RawMessage, index: number): NormalizedMessage[] => {
  const roleRaw = String(msg.role ?? '').toLowerCase()
  const ts = msg.timestamp ?? 0
  const text = extractMessageText(msg)

  if (!text.trim()) return []

  const role: NormalizedMessage['role'] =
    roleRaw === 'user' ? 'user' : roleRaw === 'system' ? 'system' : 'assistant'

  return [
    {
      id: `msg-${index}`,
      role,
      content: text,
      timestamp: ts,
      thinking: '',
    },
  ]
}

// ============================================================
// 格式检测
// ============================================================

/**
 * 检测原始消息的协议格式。
 *
 * @param msg - 原始消息
 * @returns 检测到的格式标识
 */
type MessageFormat = 'claw' | 'openai' | 'anthropic' | 'plain'

const detectFormat = (msg: RawMessage): MessageFormat => {
  const roleRaw = String(msg.role ?? '').toLowerCase()

  // Claw 特征：role === 'toolresult'，或 content 中含 type:'toolCall'/'toolResult'
  if (roleRaw === 'toolresult') return 'claw'
  if (
    Array.isArray(msg.content) &&
    msg.content.some((c) => {
      const t = String(c?.type ?? '').toLowerCase()
      return t === 'toolcall' || t === 'toolresult'
    })
  ) {
    return 'claw'
  }

  // OpenAI 特征：顶层 tool_calls 数组，或 role === 'tool'/'function'
  if (Array.isArray(msg.tool_calls) && msg.tool_calls.length > 0) return 'openai'
  if (roleRaw === 'tool' || roleRaw === 'function') return 'openai'

  // Anthropic 特征：content 中含 type:'tool_use'/'tool_result'
  if (
    Array.isArray(msg.content) &&
    msg.content.some((c) => {
      const t = String(c?.type ?? '').toLowerCase()
      return t === 'tool_use' || t === 'tool_result'
    })
  ) {
    return 'anthropic'
  }

  return 'plain'
}

// ============================================================
// 主入口
// ============================================================

/**
 * 将服务端返回的原始历史消息规范化为统一格式。
 *
 * 支持以下协议格式的自动识别与转换：
 * - **Claw 原生**：`content[].type === 'toolCall'/'toolResult'`，`role === 'toolresult'`
 * - **OpenAI (Chat Completions)**：`tool_calls[]`，`role === 'tool'`
 * - **Anthropic (Messages)**：`content[].type === 'tool_use'/'tool_result'`，`tool_use_id`
 * - **纯文本**：`{ role: 'user'|'assistant', content: '...' }`（兜底）
 *
 * 适配器模式设计：`detectFormat()` 自动识别 → 路由到对应适配器 →
 * 输出统一的 `NormalizedMessage[]`。
 *
 * @param messages - 服务端返回的原始消息数组，格式可能混合
 * @returns 规范化后的消息列表，保持原始顺序，工具调用与文本消息按正确时序排列
 *
 * @example
 * ```typescript
 * const raw = [
 *   { role: 'user', content: '帮我读一下文件' },
 *   { role: 'assistant', tool_calls: [{ id: '1', function: { name: 'read_file', arguments: '{"path":"/a.txt"}' } }] },
 *   { role: 'tool', tool_call_id: '1', content: 'Hello World' },
 *   { role: 'assistant', content: '文件内容是 Hello World' },
 * ]
 * const normalized = normalizeHistoryMessages(raw)
 * // → [
 * //   { role: 'user', content: '帮我读一下文件' },
 * //   { role: 'toolcall', toolCalls: [{ id: '1', name: 'read_file', args: { path: '/a.txt' } }] },
 * //   { role: 'toolresult', toolCallId: '1', content: 'Hello World' },
 * //   { role: 'assistant', content: '文件内容是 Hello World' },
 * // ]
 * ```
 */
export const normalizeHistoryMessages = (messages?: RawMessage[]): NormalizedMessage[] => {
  if (!Array.isArray(messages)) {
    return []
  }

  const result: NormalizedMessage[] = []

  for (const [index, msg] of messages.entries()) {
    // 跳过空消息
    if (!msg || typeof msg !== 'object') continue

    const format = detectFormat(msg)

    let normalized: NormalizedMessage[]
    switch (format) {
      case 'claw':
        normalized = adaptClawNative(msg, index)
        break
      case 'openai':
        normalized = adaptOpenAI(msg, index)
        break
      case 'anthropic':
        normalized = adaptAnthropic(msg, index)
        break
      default:
        normalized = adaptPlain(msg, index)
    }

    result.push(...normalized)
  }

  logger.debug(`Normalized ${messages.length} raw messages → ${result.length} normalized messages`)
  return result
}
