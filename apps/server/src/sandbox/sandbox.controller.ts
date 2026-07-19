import { Controller, Post, Body, Param } from '@nestjs/common'

/**
 * SandboxController — 代码执行沙箱代理。
 *
 * 将前端的代码执行请求转发到本地 Docker 沙箱容器（localhost:3002）。
 * 不需要 JWT 鉴权（仅开发环境使用）。
 */
@Controller('/api/sandbox')
export class SandboxController {
  private readonly SANDBOX_URL = process.env.SANDBOX_URL ?? 'http://localhost:3002'

  /**
   * POST /api/sandbox/run
   *
   * Body: { language: 'python' | 'javascript', code: string, input?: string }
   */
  @Post('/run')
  async runCode(@Body() body: { language: string; code: string; input?: string }) {
    const res = await fetch(`${this.SANDBOX_URL}/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    return res.json()
  }

  /** GET /api/sandbox/health */
  @Post('/health')
  async health() {
    const res = await fetch(`${this.SANDBOX_URL}/health`)
    return res.json()
  }
}
