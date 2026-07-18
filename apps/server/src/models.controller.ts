import { Controller, Get } from '@nestjs/common'

/** DeepSeek 可用模型 */
const AVAILABLE_MODELS = [
  { id: 'deepseek-v4-pro', label: 'DeepSeek V4 Pro', desc: '旗舰对话模型' },
  { id: 'deepseek-v4-flash', label: 'DeepSeek V4 Flash', desc: '快速轻量模型' },
]

export interface ModelInfo {
  id: string
  label: string
  desc: string
}

/**
 * ModelsController — 模型列表。
 *
 * 公开接口，无需鉴权。
 */
@Controller('/api')
export class ModelsController {
  @Get('/models')
  list(): ModelInfo[] {
    return AVAILABLE_MODELS
  }
}
