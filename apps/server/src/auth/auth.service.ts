import { Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcryptjs'
import { PrismaService } from '../prisma/prisma.service'

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
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * 用户名 + 密码登录。
   *
   * @returns { accessToken, refreshToken, user }
   */
  async login(username: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { username } })
    if (!user) throw new UnauthorizedException('用户名或密码错误')

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) throw new UnauthorizedException('用户名或密码错误')

    return this.generateTokens(user)
  }

  /**
   * 注册新用户。
   *
   * @param username - 用户名
   * @param password - 明文密码
   * @returns 创建的用户信息（不含密码哈希）
   */
  async register(username: string, password: string) {
    const existing = await this.prisma.user.findUnique({ where: { username } })
    if (existing) throw new UnauthorizedException('用户名已存在')

    const passwordHash = await bcrypt.hash(password, 10)
    const user = await this.prisma.user.create({
      data: { username, passwordHash },
    })

    return { id: user.id, username: user.username, createdAt: user.createdAt }
  }

  /**
   * 用 refreshToken 刷新 accessToken。
   */
  async refresh(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET!,
      })

      const user = await this.prisma.user.findUnique({ where: { id: payload.sub } })
      if (!user) throw new UnauthorizedException('用户不存在')

      return this.generateTokens(user)
    } catch {
      throw new UnauthorizedException('refreshToken 无效或已过期')
    }
  }

  /**
   * 签发 accessToken + refreshToken。
   */
  private generateTokens(user: { id: number; username: string }) {
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
