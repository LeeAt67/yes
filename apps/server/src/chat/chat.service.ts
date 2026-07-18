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
  model: 'gpt-4o-mini',
  enableThinking: false,
  webSearchStatus: 'disabled' as const,
  maxTokens: 2048,
}

// ── LLM chunk ──
interface LLMChunk {
  choices?: Array<{ delta?: { content?: string } }>
}

/**
 * ChatService — 封装 LLM API 调用，返回异步生成器。
 */
@Injectable()
export class ChatService {
  /**
   * 向 LLM 发起流式请求，返回 AsyncGenerator 逐 token 产出。
   *
   * 产出 `{ token }` | `{ error }` | `{ done }` 三种事件。
   */
  async *streamChat(body: ChatRequest): AsyncGenerator<Record<string, unknown>> {
    const { query, system, modelConfig: rawMc } = body
    const mc = { ...DEFAULT_MODEL_CONFIG, ...rawMc }

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
            ...(system ? [{ role: 'system', content: system }] : []),
            { role: 'user', content: query },
          ],
          max_tokens: mc.maxTokens,
          ...(mc.temperature !== undefined ? { temperature: mc.temperature } : {}),
          stream: true,
        }),
      })
    } catch (err) {
      yield { error: `LLM API unreachable: ${(err as Error).message}` }
      yield { done: true }
      return
    }

    if (!llmRes.ok) {
      const errText = await llmRes.text().catch(() => '')
      console.error(`[chat] LLM API error ${llmRes.status}:`, errText)
      yield { error: `LLM API error ${llmRes.status}` }
      yield { done: true }
      return
    }

    // 管道：字节流 → 文本流 → 消费
    const reader = llmRes.body!
      .pipeThrough(new TextDecoderStream())
      .getReader()

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        if (!value) continue

        for (const line of value.split('\n')) {
          if (!line.startsWith('data: ')) continue
          const raw = line.slice(6).trim()
          if (raw === '[DONE]') {
            yield { done: true }
            return
          }

          try {
            const chunk: LLMChunk = JSON.parse(raw)
            const token = chunk.choices?.[0]?.delta?.content
            if (token) yield { token }
          } catch { /* skip */ }
        }
      }
    } catch { /* stream interrupted */ }

    yield { done: true }
  }
}
