import { Injectable } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'

/**
 * JWT 策略 — 从 `************** ******` 头提取并验证 token。
 *
 * 验证成功 → 注入 `req.user = { userId, username }`
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET!,
    })
  }

  /**
   * Passport 验证通过后调用，返回值绑定到 req.user。
   */
  async validate(payload: { sub: number; username: string }) {
    return { userId: payload.sub, username: payload.username }
  }
}
