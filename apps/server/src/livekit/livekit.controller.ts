import { Controller, Post, Body, BadRequestException, UseGuards, Req } from '@nestjs/common'
import type { Request } from 'express'
import { z, ZodError } from 'zod'
import { LiveKitService, type LiveKitTokenResponse } from './livekit.service'
import { TTSService, type TTSSynthesizeRequest } from './tts.service'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { createLogger } from '../lib/logger'

const logger = createLogger('livekit:controller')

/** Token 签发请求 Schema */
const tokenRequestSchema = z.object({
  roomName: z.string().min(1, '房间名不能为空'),
})

/** TTS 合成请求 Schema */
const ttsRequestSchema = z.object({
  text: z.string().min(1, '文本不能为空'),
  voice: z.string().optional(),
  speed: z.number().min(0.5).max(2.0).optional(),
})

/**
 * LiveKitController — LiveKit 语音/视频通话 API。
 *
 * 路由前缀 `/api/livekit`，需要 JWT 鉴权。
 * - POST /api/livekit/token — 签发入房 Token
 * - POST /api/livekit/tts — TTS 语音合成
 */
@UseGuards(JwtAuthGuard)
@Controller('/api/livekit')
export class LiveKitController {
  constructor(
    private readonly livekitService: LiveKitService,
    private readonly ttsService: TTSService,
  ) {}

  /**
   * POST /api/livekit/token
   *
   * 签发进入 LiveKit 房间的 Access Token。
   * 从 JWT payload 中提取 userId 作为 LiveKit 身份标识。
   */
  @Post('/token')
  async issueToken(@Body() rawBody: unknown, @Req() req: Request): Promise<LiveKitTokenResponse> {
    const parsed = this.parseOrThrow(tokenRequestSchema, rawBody)
    const userId = (req as any).user?.sub ?? (req as any).user?.userId ?? 'anonymous'
    const userName = (req as any).user?.username ?? userId

    logger.info('Token requested:', { roomName: parsed.roomName, userId })
    return this.livekitService.issueToken(parsed.roomName, userId, userName)
  }

  /**
   * POST /api/livekit/tts
   *
   * 将文本合成为语音。返回 audio/mpeg 格式的音频数据。
   */
  @Post('/tts')
  async synthesize(@Body() rawBody: unknown): Promise<Buffer> {
    const parsed = this.parseOrThrow(ttsRequestSchema, rawBody)
    const audioBuffer = await this.ttsService.synthesize(parsed)
    return Buffer.from(audioBuffer)
  }

  /** Zod 校验，失败抛 400 */
  private parseOrThrow<T>(schema: z.ZodSchema<T>, raw: unknown): T {
    try {
      return schema.parse(raw)
    } catch (e) {
      if (e instanceof ZodError) {
        throw new BadRequestException({
          error: 'Invalid request',
          details: e.flatten(),
        })
      }
      throw e
    }
  }
}
