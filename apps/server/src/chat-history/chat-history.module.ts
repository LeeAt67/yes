import { Module } from '@nestjs/common'
import { PrismaModule } from '../prisma/prisma.module'
import { ChatHistoryController } from './chat-history.controller'
import { ChatHistoryService } from './chat-history.service'

@Module({
  imports: [PrismaModule],
  controllers: [ChatHistoryController],
  providers: [ChatHistoryService],
})
export class ChatHistoryModule {}
