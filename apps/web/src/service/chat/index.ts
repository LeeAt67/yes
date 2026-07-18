import { z } from 'zod'
import { createLogger } from '@yes/shared'

const logger = createLogger('service:chat')

/** 后端 API 基地址 */
const API_BASE = 'http://localhost:3001'

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
}

/**
 * 流式聊天回调类型。
 */
export type StreamCallback = (token: string, done: boolean) => void

/**
 * 发送聊天消息（流式 SSE）。
 */
export const streamChatMessage = async (
  content: string,
  onToken: StreamCallback,
): Promise<Message[]> => {
  logger.info('Streaming chat message:', { content })

  const response = await fetch(API_BASE + '/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  })

  if (!response.ok || !response.body) {
    logger.warn('Chat API failed:', response.status)
    return []
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let fullContent = ''
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })

    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const parsed = JSON.parse(line.slice(6)) as SSEToken
          if (parsed.token) {
            fullContent += parsed.token
            onToken(parsed.token, false)
          }
          if (parsed.done) {
            onToken('', true)
          }
        } catch {
          // skip unparseable lines
        }
      }
    }
  }

  logger.info('Chat stream completed')
  return [
    { id: crypto.randomUUID(), role: 'user', content, createdAt: Date.now() },
    { id: crypto.randomUUID(), role: 'assistant', content: fullContent, createdAt: Date.now() },
  ]
}
