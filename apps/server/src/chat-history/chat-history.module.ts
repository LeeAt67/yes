import { Module } from '@nestjs/common'
import { PrismaModule } from '../prisma/prisma.module'
import { ChatHistoryController } from './chat-history.controller'
import { ChatHistoryService } from './chat-history.service'
import { ConversationController } from './conversation.controller'
import { ConversationService } from './conversation.service'

@Module({
  imports: [PrismaModule],
  controllers: [ChatHistoryController, ConversationController],
  providers: [ChatHistoryService, ConversationService],
})
export class ChatHistoryModule {}
