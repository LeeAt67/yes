import { Module } from '@nestjs/common'
import { AuthModule } from './auth/auth.module'
import { ChatModule } from './chat/chat.module'
import { PrismaModule } from './prisma/prisma.module'
import { HealthController } from './health.controller'

@Module({
  imports: [PrismaModule, AuthModule, ChatModule],
  controllers: [HealthController],
})
export class AppModule {}
