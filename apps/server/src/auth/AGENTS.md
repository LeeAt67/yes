# auth

> 📂 路径：`apps/server/src/auth/`
> 🏷️ 类型：**Module** (业务模块 — NestJS 鉴权)

---

## 概览

JWT 双 Token 鉴权模块。**不存会话状态**，凭 token 自身携带的用户信息 (`sub` + `username`) 完成身份识别。

## 核心概念

- **accessToken (15min)**：短期令牌，通过 `Authorization: Bearer <token>` 传递，用于 API 鉴权。
- **refreshToken (7d)**：长期令牌，仅用于换取新 accessToken。与 accessToken 用不同密钥签名 (`JWT_REFRESH_SECRET`)。

> 双密钥设计的意义：即使 accessToken 签名密钥泄露，攻击者也无法签发 refreshToken，限制了横向移动范围。

## 路由表

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|:--:|------|
| POST | `/api/auth/login` | 无 | 用户名+密码 → `{ accessToken, refreshToken, user }` |
| POST | `/api/auth/refresh` | 无 | refreshToken → 新 `{ accessToken, refreshToken, user }` |
| POST | `/api/auth/register` | 无 | 创建新用户（用户名唯一） |

## 文件职责

| 文件 | 职责 |
|------|------|
| `auth.module.ts` | 注册 JwtModule、PassportModule、Service、Strategy |
| `auth.controller.ts` | Zod 校验入参 → 调用 Service |
| `auth.service.ts` | bcrypt 验密 / Prisma 查用户 / JWT 签发 |
| `jwt.strategy.ts` | `ExtractJwt.fromAuthHeaderAsBearerToken()` → 验证 → `req.user` |
| `jwt-auth.guard.ts` | `@UseGuards(JwtAuthGuard)` 保护 Controller 方法 |

## 数据流

```
POST /api/auth/login { username, password }
  → Zod 校验 (loginSchema)
  → Prisma.user.findUnique({ username })
  → bcrypt.compare(password, user.passwordHash)
  → JWT sign({ sub: userId, username })
  → { accessToken, refreshToken, user }
```

**隐式链路**：`refresh` 方法中 `jwtService.verify()` 用的是 `JWT_REFRESH_SECRET`，而 `login` 签发的 accessToken 用的是 `JwtModule.register` 里的 `JWT_SECRET` — 两个密钥互不相通，防止 refreshToken 直接被用于 API 访问。

## 与其他模块的关系

- **PrismaModule**：通过 DI 注入 `PrismaService` 访问 `user` 表。
- **ChatModule**：通过 `JwtAuthGuard` 保护 ChatController 的所有端点。
