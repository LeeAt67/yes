/**
 * 种子脚本 — 创建初始管理员用户。
 *
 * 运行：npx tsx prisma/seed.ts
 */
import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma/client.js'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient({
  adapter: new PrismaLibSql({ url: process.env.DATABASE_URL! }),
})

async function main() {
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      passwordHash: await bcrypt.hash('admin123', 10),
    },
  })

  console.log(`✅ 种子用户: ${admin.username} (id: ${admin.id})`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
