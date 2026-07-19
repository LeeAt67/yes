import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Body,
  Param,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { diskStorage } from 'multer'
import { join } from 'path'
import { readFileSync } from 'fs'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { UploadService } from './upload.service'

// 分片上传 multer 配置（内存存储，小文件直接读 buffer）
const chunkMulter = { storage: diskStorage({ destination: join(process.cwd(), 'public', 'chunks'), filename: (_r, _f, cb) => cb(null, `${Date.now()}`) }) }

@UseGuards(JwtAuthGuard)
@Controller('/api/upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  /** POST /api/upload/check — 检查 MD5 是否已有文件 */
  @Post('/check')
  checkMd5(@Body() body: { md5: string }) {
    const url = this.uploadService.checkByMd5(body.md5)
    if (url) return { exists: true, url }
    return { exists: false }
  }

  /** POST /api/upload/chunk/init — 初始化分片上传会话 */
  @Post('/chunk/init')
  initChunk(@Body() body: { fileName: string; totalChunks: number; fileSize: number; md5: string }) {
    return this.uploadService.initChunks(body.fileName, body.totalChunks, body.fileSize, body.md5)
  }

  /** POST /api/upload/chunk — 上传单个分片 */
  @Post('/chunk')
  @UseInterceptors(FileInterceptor('chunk', chunkMulter))
  uploadChunk(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { uploadId: string; index: string },
  ) {
    if (!file) return { ok: false }
    const buffer = readFileSync(file.path)
    const ok = this.uploadService.saveChunk(body.uploadId, Number(body.index), buffer)
    try { require('fs').unlinkSync(file.path) } catch { /* ignore */ }
    return { ok }
  }

  /** POST /api/upload/chunk/merge — 合并分片 */
  @Post('/chunk/merge')
  mergeChunks(@Body() body: { uploadId: string; fileName: string; totalChunks: number; md5: string }) {
    return this.uploadService.mergeChunks(body.uploadId, body.fileName, body.totalChunks, body.md5)
  }

  /** POST /api/upload/chunk/status — 查询分片进度 */
  @Post('/chunk/status')
  chunkStatus(@Body() body: { uploadId: string }) {
    const completed = this.uploadService.chunkStatus(body.uploadId)
    return { completed }
  }

  /** POST /api/upload — 全量上传（兼容旧路径，小文件直传） */
  @Post('/')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: join(process.cwd(), 'public', 'uploads'),
        filename: (_req, file, cb) => {
          const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
          const ext = file.originalname.split('.').pop() ?? 'bin'
          cb(null, `${unique}.${ext}`)
        },
      }),
      limits: { fileSize: 20 * 1024 * 1024 },
    }),
  )
  upload(@UploadedFile() file: Express.Multer.File) {
    if (!file) return { error: '未收到文件' }
    const { url, md5 } = this.uploadService.save(file)
    return { url, md5, name: file.originalname, size: file.size }
  }
}
