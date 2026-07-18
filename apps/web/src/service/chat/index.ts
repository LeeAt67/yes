import { z } from 'zod'
import { createLogger, Req } from '@yes/shared'

const logger = createLogger('service:chat')

/** API 请求实例 — 开发环境指向本地后端，生产通过反向代理同源访问 */
const api = new Req({ baseURL: process.env.API_BASE_URL ?? 'http://localhost:3001' })

/** 聊天消息 schema */
export const messageSchema = z.object({
  id: z.string(),
  role: z.enum(['user', 'assistant']),
  content: z.string(),
  createdAt: z.number(),
})

export type Message = z.infer<typeof messageSchema>

/** SSE token 块 */
interface SSEToken {
  token?: string
  done?: boolean
  error?: string
}

/**
 * 流式聊天回调类型。
 */
export type StreamCallback = (token: string, done: boolean) => void

/** 模型配置 — 收敛到一个对象里 */
export interface ModelConfig {
  /** 模型代号，默认 gpt-4o-mini */
  model?: string
  /** 深度思考开关 */
  enableThinking?: boolean
  /** 联网搜索：disabled | enabled */
  webSearchStatus?: 'disabled' | 'enabled'
  /** 最大输出 token */
  maxTokens?: number
  /** 随机性 0-2 */
  temperature?: number
}

/** 流式请求可选参数 */
export interface ChatStreamOptions {
  /** 会话 ID（多轮对话） */
  conversationId: string
  /** 单条消息唯一 ID，不传自动生成 */
  msgId?: string
  /** 系统提示词 */
  system?: string
  /** 模型配置对象 */
  modelConfig?: ModelConfig
  /** 多模态附件（预留） */
  multiMedias?: unknown[]
}

/**
 * 发送聊天消息（流式 SSE）。
 *
 * 管道：Req.stream → ReadableStream → TextDecoderStream → while(true) 消费
 *
 * @param query - 用户输入内容
 * @param onToken - 每收到一个 token 时回调
 * @param options - 必传 conversationId，可选 msgId/modelConfig/system/multiMedias
 * @returns 解析后的完整消息数组
 */
export const streamChatMessage = async (
  query: string,
  onToken: StreamCallback,
  options: ChatStreamOptions,
): Promise<Message[]> => {
  const msgId = options.msgId ?? crypto.randomUUID()
  logger.info('Streaming chat message:', { msgId, conversationId: options.conversationId })

  // Go 风格：永不抛异常
  const [response, err] = await api.stream('/api/chat', {
    msgId,
    conversationId: options.conversationId,
    query,
    system: options.system,
    modelConfig: options.modelConfig ?? {},
    multiMedias: options.multiMedias ?? [],
  })

  if (err) {
    logger.warn('Chat API failed:', err.status, err.message)
    return []
  }

  // 管道：字节流 → 文本流
  const reader = response!
    .body!
    .pipeThrough(new TextDecoderStream())
    .getReader()

  let fullContent = ''

  // 使用 while(true) 循环读取流数据
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    if (!value) continue

    // 逐行解析 SSE 的 data: 行
    for (const line of value.split('\n')) {
      if (!line.startsWith('data: ')) continue

      try {
        const parsed = JSON.parse(line.slice(6)) as SSEToken

        if (parsed.error) {
          logger.warn('Chat stream error:', parsed.error)
          return [
            { id: crypto.randomUUID(), role: 'user', content: query, createdAt: Date.now() },
            { id: crypto.randomUUID(), role: 'assistant', content: parsed.error, createdAt: Date.now() },
          ]
        }

        if (parsed.token) {
          fullContent += parsed.token
          onToken(parsed.token, false)
        }

        if (parsed.done) {
          logger.info('Chat stream completed')
          return [
            { id: crypto.randomUUID(), role: 'user', content: query, createdAt: Date.now() },
            { id: crypto.randomUUID(), role: 'assistant', content: fullContent, createdAt: Date.now() },
          ]
        }
      } catch {
        // 跳过无法解析的行
      }
    }
  }

  logger.info('Chat stream ended without done signal')
  return [
    { id: crypto.randomUUID(), role: 'user', content: query, createdAt: Date.now() },
    { id: crypto.randomUUID(), role: 'assistant', content: fullContent, createdAt: Date.now() },
  ]
}
