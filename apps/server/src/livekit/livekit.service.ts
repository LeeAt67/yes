import { Injectable } from '@nestjs/common'
import { AccessToken } from 'livekit-server-sdk'
import { createLogger } from '../lib/logger'

const logger = createLogger('livekit:service')

/**
 * LiveKit Token 签发响应。
 */
export interface LiveKitTokenResponse {
  /** WebSocket 地址 */
  wsUrl: string
  /** 签发的 Access Token */
  token: string
}

/**
 * LiveKitService — LiveKit Token 签发。
 *
 * 用 livekit-server-sdk 为前端签发进入房间的 JWT Access Token。
 * 身份由当前登录用户的 userId 确定。
 */
@Injectable()
export class LiveKitService {
  private readonly apiKey = process.env.LIVEKIT_API_KEY!
  private readonly apiSecret = process.env.LIVEKIT_API_SECRET!
  private readonly wsUrl = process.env.LIVEKIT_WS_URL!

  /**
   * 为指定用户签发房间 Token。
   *
   * @param roomName - 房间名称（一般对应 conversationId）
   * @param userId - 用户标识（JWT 中的 sub）
   * @param userName - 用户显示名
   * @returns Token + WebSocket 地址
   */
  issueToken = async (
    roomName: string,
    userId: string,
    userName: string,
  ): Promise<LiveKitTokenResponse> => {
    logger.info('Issuing LiveKit token:', { roomName, userId })

    const at = new AccessToken(this.apiKey, this.apiSecret, {
      identity: userId,
      name: userName,
    })

    at.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    })

    return {
      wsUrl: this.wsUrl,
      token: await at.toJwt(),
    }
  }
}
