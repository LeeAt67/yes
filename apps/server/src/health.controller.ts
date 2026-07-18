import { Controller, Get } from '@nestjs/common'

/**
 * 健康检查控制器。
 */
@Controller('/api')
export class HealthController {
  @Get('/health')
  status() {
    return { status: 'ok', timestamp: Date.now() }
  }
}
