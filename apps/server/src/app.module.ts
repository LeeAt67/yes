import { Module } from '@nestjs/common'
import { AuthModule } from './auth/auth.module'
import { ChatModule } from './chat/chat.module'
import { ChatHistoryModule } from './chat-history/chat-history.module'
import { PrismaModule } from './prisma/prisma.module'
import { HealthController } from './health.controller'
import { ModelsController } from './models.controller'

@Module({
  imports: [PrismaModule, AuthModule, ChatModule, ChatHistoryModule],
  controllers: [HealthController, ModelsController],
})
export class AppModule {}
