import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common'
import { PrismaClient } from '../generated/prisma/client.js'
import { PrismaLibSql } from '@prisma/adapter-libsql'

/**
 * PrismaService — 数据库客户端，NestJS 可注入的单例。
 *
 * 基于 Prisma v7 + libSQL 适配器连接 SQLite。
 * 应用启动时自动连接，关闭时自动断开。
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super({
      adapter: new PrismaLibSql({
        url: process.env.DATABASE_URL!,
      }),
    })
  }

  async onModuleInit() {
    await this.$connect()
  }

  async onModuleDestroy() {
    await this.$disconnect()
  }
}
