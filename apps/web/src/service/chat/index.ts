import { z } from 'zod'
import { createLogger } from '@yes/shared'
import { EventSourceParserStream } from 'eventsource-parser/stream'
import { api } from '../api'

const logger = createLogger('service:chat')

/** 聊天消息 schema */
export const messageSchema = z.object({
  id: z.string(),
  role: z.enum(['user', 'assistant']),
  content: z.string(),
  createdAt: z.number(),
})

export type Message = z.infer<typeof messageSchema>

/**
 * 流式聊天回调类型。
 */
export type StreamCallback = (token: string, done: boolean) => void

/** 模型配置 — 收敛到一个对象里 */
export interface ModelConfig {
  model?: string
  enableThinking?: boolean
  webSearchStatus?: 'disabled' | 'enabled'
  maxTokens?: number
  temperature?: number
}

/** 流式请求可选参数 */
export interface ChatStreamOptions {
  conversationId: string
  msgId?: string
  system?: string
  modelConfig?: ModelConfig
  multiMedias?: unknown[]
  /** 用于取消请求的 AbortSignal */
  signal?: AbortSignal
}

/** SSE 事件中解析出的 payload，对齐格式 */
interface SSEPayload {
  type?: string
  content?: string
  promptTokens?: number
  completionTokens?: number
  totalTokens?: number
}

/** SSE 事件队列项 */
interface SSEQueueItem {
  type: 'token' | 'finish' | 'error' | 'usage'
  content?: string
  promptTokens?: number
  completionTokens?: number
  totalTokens?: number
}

/**
 * 发送聊天消息（流式 SSE）—— 生产者-消费者模型。
 *
 * 架构：
 *   readLoop（全速消费 SSE 事件，入队）
 *     → queue
 *       → 消费端（RAF 节流，每帧最多 flush 一次）
 *
 * 将网络读取与 UI 产出解耦，避免 SSE 消费阻塞渲染帧。
 */
export const streamChatMessage = async (
  query: string,
  onToken: StreamCallback,
  options: ChatStreamOptions,
): Promise<Message[]> => {
  const msgId = options.msgId ?? crypto.randomUUID()
  logger.info('Streaming chat message:', { msgId, conversationId: options.conversationId })

  // ① Go 风格：永不抛异常
  const [response, err] = await api.stream('/api/chat', {
    msgId,
    conversationId: options.conversationId,
    query,
    system: options.system,
    modelConfig: options.modelConfig ?? {},
    multiMedias: options.multiMedias ?? [],
  }, options.signal)

  if (err) {
    logger.warn('Chat API failed:', err.status, err.message)
    return []
  }

  // ② 管道：字节流 → 文本流 → SSE 事件
  const reader = response!
    .body!
    .pipeThrough(new TextDecoderStream())
    .pipeThrough(new EventSourceParserStream())
    .getReader()

  // ③ 生产者-消费者模型
  //
  // 参考 mimo-chat sse.ts 的架构：
  // - readLoop 全速消费 SSE，message token 累积到 cachedContent
  // - scheduleRafFlush 保证每帧最多产出一次内容更新（对齐浏览器渲染帧）
  // - 控制事件（finish/error/usage）立即入队，通过 notify() 唤醒消费端
  // - 消费端用 Promise.resolve 等待，而非 RAF 轮询，避免无谓的帧消耗
  const queue: SSEQueueItem[] = []
  let fullContent = ''
  let readLoopDone = false
  let readLoopErr: unknown = null

  /** 消费端等待时的 resolve 句柄，有新数据时调用以唤醒 */
  let resolveWaiter: (() => void) | null = null

  /** 唤醒正在等待的消费端 */
  const notify = () => {
    if (resolveWaiter) {
      resolveWaiter()
      resolveWaiter = null
    }
  }

  /** 推入队列并唤醒消费端 */
  const enqueue = (item: SSEQueueItem) => {
    queue.push(item)
    notify()
  }

  // RAF 聚合：message token 不立即产出，在下一帧合并为单次更新
  // 保证每帧最多触发一次 onToken → MobX 更新 → React 重渲染
  let cachedContent = ''
  let rafId: number | null = null

  /**
   * 立即把累积的 token 内容产出（取消待执行的 RAF）。
   * 用于控制事件入队前，确保正文内容先于控制事件产出。
   */
  const flushCache = () => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId)
      rafId = null
    }
    if (cachedContent) {
      onToken(cachedContent, false)
      cachedContent = ''
    }
  }

  /**
   * 排期一次 RAF flush：在下一帧把累积 token 产出。
   * 已有排期时直接返回，保证每帧最多 flush 一次。
   */
  const scheduleRafFlush = () => {
    if (rafId !== null) return
    rafId = requestAnimationFrame(() => {
      rafId = null
      if (cachedContent) {
        onToken(cachedContent, false)
        cachedContent = ''
      }
    })
  }

  // 生产者：全速消费 SSE 事件
  const readLoop = async () => {
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          flushCache()
          enqueue({ type: 'finish' })
          readLoopDone = true
          return
        }
        if (!value?.data) continue

        const eventType = (value as { event?: string }).event

        if (eventType === 'error') {
          flushCache()
          try {
            const parsed = JSON.parse(value.data) as SSEPayload
            enqueue({ type: 'error', content: parsed.content })
          } catch {
            enqueue({ type: 'error', content: '未知错误' })
          }
          readLoopDone = true
          return
        }

        if (eventType === 'message') {
          try {
            const parsed = JSON.parse(value.data) as SSEPayload
            if (parsed.type === 'text' && parsed.content) {
              fullContent += parsed.content
              // 累积 token，交由 RAF 聚合后产出，每帧最多触发一次重渲染
              cachedContent += parsed.content
              scheduleRafFlush()
            }
          } catch { /* skip */ }
        }

        if (eventType === 'finish') {
          flushCache()
          enqueue({ type: 'finish' })
          readLoopDone = true
          return
        }

        if (eventType === 'usage') {
          flushCache()
          try {
            const parsed = JSON.parse(value.data) as SSEPayload
            enqueue({
              type: 'usage',
              promptTokens: parsed.promptTokens,
              completionTokens: parsed.completionTokens,
              totalTokens: parsed.totalTokens,
            })
          } catch { /* skip */ }
        }
      }
    } catch (e) {
      flushCache()
      readLoopErr = e
      enqueue({ type: 'finish' })
      readLoopDone = true
    }
  }

  // 启动生产者
  readLoop()

  // 消费者：等待控制事件（finish / error / usage）
  // 使用 Promise notify 而非 RAF 轮询，避免无谓的帧消耗
  while (!readLoopDone || queue.length > 0) {
    if (queue.length === 0) {
      await new Promise<void>(resolve => { resolveWaiter = resolve })
      continue
    }

    const item = queue.shift()!

    switch (item.type) {
      case 'error': {
        flushCache()
        logger.warn('Chat stream error:', item.content)
        return [
          { id: crypto.randomUUID(), role: 'user', content: query, createdAt: Date.now() },
          { id: crypto.randomUUID(), role: 'assistant', content: item.content ?? '未知错误', createdAt: Date.now() },
        ]
      }
      case 'finish': {
        flushCache()
        if (readLoopErr) {
          const err = readLoopErr as DOMException
          if (err.name === 'AbortError') {
            logger.info('Chat stream cancelled by user')
            return [
              { id: crypto.randomUUID(), role: 'user', content: query, createdAt: Date.now() },
              { id: crypto.randomUUID(), role: 'assistant', content: fullContent, createdAt: Date.now() },
            ]
          }
        }
        logger.info('Chat stream completed')
        return [
          { id: crypto.randomUUID(), role: 'user', content: query, createdAt: Date.now() },
          { id: crypto.randomUUID(), role: 'assistant', content: fullContent, createdAt: Date.now() },
        ]
      }
      case 'usage':
        logger.info('Token usage:', { promptTokens: item.promptTokens, completionTokens: item.completionTokens })
        break
    }
  }

  // 兜底
  flushCache()
  logger.info('Chat stream ended')
  return [
    { id: crypto.randomUUID(), role: 'user', content: query, createdAt: Date.now() },
    { id: crypto.randomUUID(), role: 'assistant', content: fullContent, createdAt: Date.now() },
  ]
}
