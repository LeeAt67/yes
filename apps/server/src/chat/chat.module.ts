import { Module } from '@nestjs/common'
import { PrismaModule } from '../prisma/prisma.module'
import { ChatHistoryService } from '../chat-history/chat-history.service'
import { ConversationService } from '../chat-history/conversation.service'
import { ChatController } from './chat.controller'
import { ChatService } from './chat.service'
import { WebSearchService } from './web-search.service'

@Module({
  imports: [PrismaModule],
  controllers: [ChatController],
  providers: [ChatService, WebSearchService, ChatHistoryService, ConversationService],
})
export class ChatModule {}
