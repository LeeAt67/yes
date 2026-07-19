import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

/** 消息输入格式（前端传来） */
export interface MessageInput {
  role: 'user' | 'assistant'
  content: string
  createdAt: number
}

/** 消息输出格式（返回前端） */
export interface MessageOutput {
  id: string
  role: string
  content: string
  createdAt: number
}

/**
 * ChatHistoryService — 聊天记录持久化。
 *
 * 按 userId + conversationId 分组存储，支持整组替换。
 * 在 PrismaService 基础上封装 CRUD。
 */
@Injectable()
export class ChatHistoryService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 查询某个会话的全部消息，按时间升序排列。
   *
   * @param userId - 当前用户 ID
   * @param conversationId - 会话 ID
   */
  async findByConversation(
    userId: number,
    conversationId: string,
  ): Promise<MessageOutput[]> {
    const rows = await this.prisma.chatMessage.findMany({
      where: { userId, conversationId },
      orderBy: { createdAt: 'asc' },
    })
    return rows.map(row => ({
      id: String(row.id),
      role: row.role,
      content: row.content,
      createdAt: row.createdAt.getTime(),
    }))
  }

  /**
   * 整组替换某个会话的全部消息。
   *
   * 先删除旧数据再批量插入，保证幂等。
   *
   * @param userId - 当前用户 ID
   * @param conversationId - 会话 ID
   * @param messages - 新消息列表
   */
  async replaceConversation(
    userId: number,
    conversationId: string,
    messages: MessageInput[],
  ): Promise<void> {
    // 事务：删除旧消息 → 逐条插入新消息
    await this.prisma.$transaction(async (tx) => {
      await tx.chatMessage.deleteMany({
        where: { userId, conversationId },
      })

      for (const msg of messages) {
        await tx.chatMessage.create({
          data: {
            userId,
            role: msg.role,
            content: msg.content,
            conversationId,
            createdAt: new Date(msg.createdAt),
          },
        })
      }
    })
  }

  /**
   * 删除某个会话的全部消息。
   *
   * @param userId - 当前用户 ID
   * @param conversationId - 会话 ID
   */
  async deleteConversation(
    userId: number,
    conversationId: string,
  ): Promise<void> {
    await this.prisma.chatMessage.deleteMany({
      where: { userId, conversationId },
    })
  }
}
