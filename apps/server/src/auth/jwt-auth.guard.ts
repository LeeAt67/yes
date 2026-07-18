import { Injectable } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'

/**
 * JWT 鉴权守卫 — 在 Controller 方法上使用 `@UseGuards(JwtAuthGuard)`。
 *
 * 未携带有效 token → 返回 401
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
