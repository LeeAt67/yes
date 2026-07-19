import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

/**
 * ConversationService — 会话管理。
 *
 * 每个用户可创建多个会话。销毁会话时级联删除所有关联消息。
 */
@Injectable()
export class ConversationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 列出用户所有会话，按更新时间降序。
   */
  async list(userId: number) {
    const rows = await this.prisma.conversation.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
      },
    })
    return rows.map(r => ({
      id: r.id,
      title: r.title,
      createdAt: r.createdAt.getTime(),
      updatedAt: r.updatedAt.getTime(),
    }))
  }

  /**
   * 创建新会话。
   *
   * @param userId - 用户 ID
   * @param id - 前端生成的 UUID
   * @param title - 初始标题
   */
  async create(userId: number, id: string, title: string) {
    await this.prisma.conversation.create({
      data: { id, userId, title },
    })
  }

  /**
   * 更新会话标题和 updateAt。
   */
  async touch(userId: number, id: string, title?: string) {
    const data: Record<string, unknown> = { updatedAt: new Date() }
    if (title !== undefined) data.title = title
    await this.prisma.conversation.updateMany({
      where: { id, userId },
      data,
    })
  }

  /**
   * 删除会话及其所有消息。
   */
  async remove(userId: number, id: string) {
    // 事务内级联删除
    await this.prisma.$transaction(async (tx) => {
      await tx.chatMessage.deleteMany({ where: { userId, conversationId: id } })
      await tx.conversation.deleteMany({ where: { id, userId } })
    })
  }
}
