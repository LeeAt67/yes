import { Hono } from 'hono'
import { streamSSE } from 'hono/streaming'
import { z } from 'zod'

/**
 * 聊天请求 schema。
 */
const chatRequestSchema = z.object({
  content: z.string().min(1).max(4000),
  model: z.string().optional().default('sonnet-5-medium'),
})

/**
 * 聊天路由 — POST /api/chat
 *
 * 接受 JSON body { content, model? }，返回 SSE 流式文本。
 */
export const chatRouter = new Hono().post('/', async (c) => {
  const body = await c.req.json()
  const parsed = chatRequestSchema.safeParse(body)

  if (!parsed.success) {
    return c.json({ error: 'Invalid request', details: parsed.error.flatten() }, 400)
  }

  const { content } = parsed.data

  return streamSSE(c, async (stream) => {
    // 模拟 AI 逐字输出（后续对接真实 LLM API）
    const reply = generateMockReply(content)

    for (let i = 0; i < reply.length; i++) {
      await stream.sleep(30) // 模拟打字延迟
      await stream.writeSSE({
        data: JSON.stringify({ token: reply[i], index: i }),
      })
    }

    // 结束信号
    await stream.writeSSE({
      data: JSON.stringify({ done: true }),
    })
  })
})

/**
 * 生成模拟回复（占位，后续替换为真实 LLM 调用）。
 */
const generateMockReply = (content: string): string => {
  const templates = [
    `好的，我理解了你的问题：「${content}」。让我来帮你分析一下……`,
    `关于「${content}」，我有以下几点想法：`,
    `这是一个很好的问题！「${content}」可以从多个角度来看：`,
  ]
  const base = templates[Math.floor(Math.random() * templates.length)]

  // 追加一些额外内容让回复有长度感
  const extra = [
    '首先，我们需要明确问题的核心。',
    '其次，从实际应用的角度来看，这个问题涉及多个层面。',
    '最后，我建议你可以尝试以下几种方法来解决。',
  ].join(' ')

  return `${base} ${extra}`
}
