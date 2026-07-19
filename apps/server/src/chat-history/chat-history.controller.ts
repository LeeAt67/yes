import {
  Controller,
  Get,
  Put,
  Delete,
  Param,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common'
import type { Request as ExpressRequest } from 'express'
import { ChatHistoryService } from './chat-history.service'
import type { MessageInput } from './chat-history.service'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'

/** JWT payload 中携带的用户信息 */
interface AuthenticatedUser {
  userId: number
  username: string
}

/**
 * ChatHistoryController — 聊天记录持久化 API。
 *
 * 路由前缀 `/api/chat-history`，需要 JWT 鉴权。
 */
@UseGuards(JwtAuthGuard)
@Controller('/api/chat-history')
export class ChatHistoryController {
  constructor(private readonly chatHistoryService: ChatHistoryService) {}

  /**
   * GET /api/chat-history/:conversationId
   *
   * 获取指定会话的全部消息，按时间升序排列。
   */
  @Get('/:conversationId')
  async getConversation(
    @Param('conversationId') conversationId: string,
    @Req() req: ExpressRequest & { user: AuthenticatedUser },
  ) {
    const messages = await this.chatHistoryService.findByConversation(
      req.user.userId,
      conversationId,
    )
    return { messages }
  }

  /**
   * PUT /api/chat-history/:conversationId
   *
   * 整组替换指定会话的全部消息。
   * Body: { messages: MessageInput[] }
   */
  @Put('/:conversationId')
  async saveConversation(
    @Param('conversationId') conversationId: string,
    @Body() body: { messages: MessageInput[] },
    @Req() req: ExpressRequest & { user: AuthenticatedUser },
  ) {
    await this.chatHistoryService.replaceConversation(
      req.user.userId,
      conversationId,
      body.messages ?? [],
    )
    return { ok: true }
  }

  /**
   * DELETE /api/chat-history/:conversationId
   *
   * 删除指定会话的全部消息。
   */
  @Delete('/:conversationId')
  async deleteConversation(
    @Param('conversationId') conversationId: string,
    @Req() req: ExpressRequest & { user: AuthenticatedUser },
  ) {
    await this.chatHistoryService.deleteConversation(
      req.user.userId,
      conversationId,
    )
    return { ok: true }
  }
}
