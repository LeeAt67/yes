import { api } from './api'
import { createLogger } from '@yes/shared'

const logger = createLogger('livekit:service')

/** Token 签发响应 */
interface LiveKitTokenResponse {
  wsUrl: string
  token: string
}

/** Token 签发响应 Schema（运行时校验用） */
const tokenResponseSchema = {
  wsUrl: 'string',
  token: 'string',
}

/**
 * LiveKitService — LiveKit 相关 API 调用封装。
 *
 * 提供获取入房 Token、TTS 合成等接口。
 */
const livekitService = {
  /**
   * 获取进入 LiveKit 房间的 Token。
   *
   * @param roomName - 房间名称
   * @returns { wsUrl, token }
   */
  getToken: async (roomName: string): Promise<LiveKitTokenResponse> => {
    logger.info('请求 LiveKit token:', { roomName })
    const [data, err] = await api.post<LiveKitTokenResponse>('/api/livekit/token', { roomName })
    if (err) {
      logger.error('获取 LiveKit token 失败:', err)
      throw err
    }
    return data!
  },

  /**
   * TTS 文本转语音。
   *
   * @param text - 待合成文本
   * @param voice - 音色 ID（可选）
   * @returns ArrayBuffer 音频数据
   */
  synthesizeSpeech: async (text: string, voice?: string): Promise<ArrayBuffer> => {
    logger.info('TTS 合成请求:', { textLen: text.length, voice })
    const [data, err] = await api.post<ArrayBuffer>('/api/livekit/tts', { text, voice })
    if (err) {
      logger.error('TTS 合成失败:', err)
      throw err
    }
    return data!
  },
}

export default livekitService
