# prisma

> 📂 路径：`apps/server/src/prisma/`
> 🏷️ 类型：**Module** (基础设施 — 数据库访问层)

---

## 概览

Prisma v7 + SQLite (libSQL 适配器) 的 NestJS 封装。`@Global()` 模块，任何 Service 通过 DI 注入 `PrismaService` 即可访问数据库。

## 核心决策

### 为什么用 SQLite 而不是 PostgreSQL？

开发期零配置。`schema.prisma` 中模型定义与 PG 兼容，后续换 PG 只需：
1. `prisma.config.ts` 改 `DATABASE_URL`
2. 换适配器 (`PrismaPg` 替代 `PrismaLibSql`)
3. 重新 `migrate`

### 为什么 PrismaService 要 `extend PrismaClient`？

直接继承可以 `this.user.findUnique()` 而不是 `this.prisma.user.findUnique()`。同时实现 `OnModuleInit`/`OnModuleDestroy` 确保应用启停时自动连接/断开。

### Prisma v7 的适配器模式

Prisma v7 不再在 schema 中配置连接字符串，改为运行时通过 `adapter` 参数注入：

```typescript
new PrismaClient({
  adapter: new PrismaLibSql({ url: process.env.DATABASE_URL! })
})
```

种子脚本 `prisma/seed.ts` 需要独立构造 `PrismaClient`（不能注入 `PrismaService`，因为依赖 NestJS 容器）。

## 文件职责

| 文件 | 职责 |
|------|------|
| `prisma.module.ts` | `@Global()` 导出 `PrismaService` |
| `prisma.service.ts` | 继承 `PrismaClient`，配置 libSQL 适配器，启停钩子 |

## 数据模型

```prisma
model User {
  id           Int      @id @default(autoincrement())
  username     String   @unique
  passwordHash String
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
```

## 迁移与种子

- **迁移**：`npx prisma migrate dev --name <描述>` → 生成 `prisma/migrations/` + 自动应用
- **种子**：`npx tsx prisma/seed.ts` → upsert admin/admin123 用户
- **生成客户端**：`npx prisma generate` → `src/generated/prisma/`（已 gitignore）
