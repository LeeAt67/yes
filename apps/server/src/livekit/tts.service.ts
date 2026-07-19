import { Injectable } from '@nestjs/common'
import { createLogger } from '../lib/logger'

const logger = createLogger('livekit:tts')

/** TTS 合成请求参数 */
export interface TTSSynthesizeRequest {
  /** 待合成文本 */
  text: string
  /** 音色 ID（可选） */
  voice?: string
  /** 语速（可选，默认 1.0） */
  speed?: number
}

/**
 * TTSService — TTS 语音合成代理。
 *
 * 代理第三方 TTS API，将文本转为语音返回给前端。
 * API Key 和 URL 通过环境变量注入。
 */
@Injectable()
export class TTSService {
  private readonly ttsApiUrl = process.env.TTS_API_URL!
  private readonly ttsApiKey = process.env.TTS_API_KEY!

  /**
   * 将文本合成为语音。
   *
   * @param params - 合成参数（文本、音色、语速）
   * @returns ArrayBuffer 格式的音频数据
   */
  synthesize = async (params: TTSSynthesizeRequest): Promise<ArrayBuffer> => {
    logger.info('TTS request:', { textLen: params.text.length, voice: params.voice })

    const response = await fetch(this.ttsApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.ttsApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: params.text,
        voice: params.voice ?? 'default',
        speed: params.speed ?? 1.0,
      }),
    })

    if (!response.ok) {
      logger.warn('TTS API failed:', response.status)
      throw new Error(`TTS API returned ${response.status}`)
    }

    return response.arrayBuffer()
  }
}
