import { Controller, Post, Body, UnauthorizedException } from '@nestjs/common'
import { AuthService } from './auth.service'
import { loginSchema, refreshSchema } from './dto/login.dto'

@Controller('/api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /api/auth/login
   *
   * Body: { username, password }
   * → { accessToken, refreshToken, user }
   */
  @Post('/login')
  async login(@Body() rawBody: unknown) {
    const parsed = loginSchema.safeParse(rawBody)
    if (!parsed.success) {
      throw new UnauthorizedException('参数错误')
    }

    return this.authService.login(parsed.data.username, parsed.data.password)
  }

  /**
   * POST /api/auth/refresh
   *
   * Body: { refreshToken }
   * → { accessToken, refreshToken, user }
   */
  @Post('/refresh')
  async refresh(@Body() rawBody: unknown) {
    const parsed = refreshSchema.safeParse(rawBody)
    if (!parsed.success) {
      throw new UnauthorizedException('参数错误')
    }

    return this.authService.refresh(parsed.data.refreshToken)
  }
}
