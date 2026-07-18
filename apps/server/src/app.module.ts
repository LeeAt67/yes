import { Module } from '@nestjs/common'
import { AuthModule } from './auth/auth.module'
import { ChatModule } from './chat/chat.module'
import { HealthController } from './health.controller'

@Module({
  imports: [AuthModule, ChatModule],
  controllers: [HealthController],
})
export class AppModule {}
