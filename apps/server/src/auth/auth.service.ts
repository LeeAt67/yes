import { Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcryptjs'

// ── 临时用户数据（后续替换为数据库）──
interface User {
  id: number
  username: string
  passwordHash: string
}

const MOCK_USERS: User[] = [
  {
    id: 1,
    username: 'admin',
    passwordHash: bcrypt.hashSync('admin123', 10),
  },
]

// ── Token 配置 ──
const ACCESS_TOKEN_EXPIRES = '15m'
const REFRESH_TOKEN_EXPIRES = '7d'

/**
 * AuthService — 登录鉴权 + Token 签发/刷新。
 *
 * JWT payload: { sub: userId, username }
 * 短期 accessToken (15min) → ************** ******
 * 长期 refreshToken (7d)   → httpOnly cookie
 */
@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  /**
   * 用户名 + 密码登录。
   *
   * @returns { accessToken, refreshToken, user }
   */
  async login(username: string, password: string) {
    const user = MOCK_USERS.find((u) => u.username === username)
    if (!user) throw new UnauthorizedException('用户名或密码错误')

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) throw new UnauthorizedException('用户名或密码错误')

    return this.generateTokens(user)
  }

  /**
   * 用 refreshToken 刷新 accessToken。
   */
  async refresh(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET!,
      })

      const user = MOCK_USERS.find((u) => u.id === payload.sub)
      if (!user) throw new UnauthorizedException('用户不存在')

      return this.generateTokens(user)
    } catch {
      throw new UnauthorizedException('refreshToken 无效或已过期')
    }
  }

  /**
   * 签发 accessToken + refreshToken。
   */
  private generateTokens(user: User) {
    const payload = { sub: user.id, username: user.username }

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: ACCESS_TOKEN_EXPIRES,
    })

    const refreshToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET!,
      expiresIn: REFRESH_TOKEN_EXPIRES,
    })

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, username: user.username },
    }
  }
}
