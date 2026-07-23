import { Controller, Post, Body, BadRequestException, Res, Req, UseGuards } from '@nestjs/common'
import type { Request as ExpressRequest, Response } from 'express'
import { ChatService, chatRequestSchema, type ChatRequest } from './chat.service'
import { ChatHistoryService, type MessageInput } from '../chat-history/chat-history.service'
import { ConversationService } from '../chat-history/conversation.service'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'

interface AuthenticatedUser {
  userId: number
  username: string
}

/**
 * ChatController — 聊天 API。
 *
 * 路由前缀 `/api/chat`，需要 JWT 鉴权。
 */
@UseGuards(JwtAuthGuard)
@Controller('/api/chat')
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly chatHistoryService: ChatHistoryService,
    private readonly conversationService: ConversationService,
  ) {}

  /**
   * POST /api/chat
   *
   * 接收 { msgId, conversationId, query, modelConfig, ... }
   * 转发 LLM API 流式响应，SSE 格式返回 { token, done }。
   */
  @Post('/')
  async chat(
    @Body() rawBody: unknown,
    @Res() res: Response,
  ): Promise<void> {
    // Zod 校验
    const parsed = chatRequestSchema.safeParse(rawBody)
    if (!parsed.success) {
      throw new BadRequestException({
        error: 'Invalid request',
        details: parsed.error.flatten(),
      })
    }

    const body: ChatRequest = parsed.data

    // SSE 响应头
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.flushHeaders()

    /** 写一条完整 SSE 事件 */
    const sseId = body.conversationId
    const writeEvent = (event: string, data: unknown) => {
      res.write(`id:${sseId}\n`)
      res.write(`event:${event}\n`)
      res.write(`data:${JSON.stringify(data)}\n\n`)
    }

    // 首个事件：对话 ID
    writeEvent('dialogId', { content: body.conversationId })

    // AsyncGenerator → SSE 行输出
    for await (const evt of this.chatService.streamChat(body)) {
      const type = evt.type as string
      switch (type) {
        case 'tool_call':
          writeEvent('tool_call', { name: evt.name, arguments: evt.arguments })
          break
        case 'tool_progress':
          writeEvent('tool_progress', { name: evt.name, message: evt.message })
          break
        case 'tool_result':
          writeEvent('tool_result', { name: evt.name, result: evt.result })
          break
        case 'text':
          writeEvent('message', { content: evt.content as string })
          break
        case 'error':
          writeEvent('error', { content: evt.content as string })
          break
        case 'usage':
          writeEvent('usage', {
            promptTokens: evt.promptTokens,
            completionTokens: evt.completionTokens,
            totalTokens: evt.totalTokens,
          })
          break
        case 'done':
          writeEvent('finish', {})
          break
      }
    }

    res.end()
  }

  /**
   * POST /api/chat/save
   *
   * 保存整段对话内容（流式结束后由前端调用）。
   * Body: { conversationId, messages: [{ role, content, createdAt }] }
   */
  @Post('/save')
  async saveMessages(
    @Body() body: { conversationId: string; messages: MessageInput[] },
    @Req() req: ExpressRequest & { user: AuthenticatedUser },
  ) {
    const { conversationId, messages } = body
    if (!conversationId || !Array.isArray(messages)) {
      throw new BadRequestException('Invalid body: need conversationId and messages array')
    }

    await this.chatHistoryService.replaceConversation(
      req.user.userId,
      conversationId,
      messages,
    )
    // 顺便 touch 会话更新时间
    await this.conversationService.touch(req.user.userId, conversationId)

    return { ok: true }
  }
}
