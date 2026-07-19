import { Module } from '@nestjs/common'
import { LiveKitController } from './livekit.controller'
import { LiveKitService } from './livekit.service'
import { TTSService } from './tts.service'

/**
 * LiveKitModule — 语音/视频通话模块。
 *
 * 提供 Token 签发（前端入房凭证）和 TTS 语音合成代理。
 */
@Module({
  controllers: [LiveKitController],
  providers: [LiveKitService, TTSService],
})
export class LiveKitModule {}
