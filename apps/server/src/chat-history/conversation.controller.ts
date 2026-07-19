import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common'
import type { Request as ExpressRequest } from 'express'
import { ConversationService } from './conversation.service'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'

interface AuthenticatedUser {
  userId: number
  username: string
}

/**
 * ConversationController — 会话列表管理。
 *
 * 路由前缀 `/api/conversations`，需要 JWT 鉴权。
 */
@UseGuards(JwtAuthGuard)
@Controller('/api/conversations')
export class ConversationController {
  constructor(private readonly conversationService: ConversationService) {}

  /** GET /api/conversations — 获取会话列表 */
  @Get('/')
  async list(@Req() req: ExpressRequest & { user: AuthenticatedUser }) {
    const list = await this.conversationService.list(req.user.userId)
    return { list }
  }

  /** POST /api/conversations — 创建新会话 */
  @Post('/')
  async create(
    @Body() body: { id: string; title: string },
    @Req() req: ExpressRequest & { user: AuthenticatedUser },
  ) {
    await this.conversationService.create(req.user.userId, body.id, body.title)
    return { ok: true }
  }

  /** DELETE /api/conversations/:id — 删除会话及所有消息 */
  @Delete('/:id')
  async remove(
    @Param('id') id: string,
    @Req() req: ExpressRequest & { user: AuthenticatedUser },
  ) {
    await this.conversationService.remove(req.user.userId, id)
    return { ok: true }
  }

  /** PUT /api/conversations/:id/touch — 更新标题 */
  @Put('/:id/touch')
  async touch(
    @Param('id') id: string,
    @Body() body: { title: string },
    @Req() req: ExpressRequest & { user: AuthenticatedUser },
  ) {
    await this.conversationService.touch(req.user.userId, id, body.title)
    return { ok: true }
  }
}
