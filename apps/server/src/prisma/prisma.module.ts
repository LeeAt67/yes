import { Global, Module } from '@nestjs/common'
import { PrismaService } from './prisma.service'

/**
 * PrismaModule — 全局模块，导出 PrismaService 供所有模块注入。
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
