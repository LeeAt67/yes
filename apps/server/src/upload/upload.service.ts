import { Injectable } from '@nestjs/common'
import { createLogger } from '../lib/logger'
import { createHash } from 'crypto'
import { readFileSync, existsSync, mkdirSync, writeFileSync, appendFileSync, readdirSync, unlinkSync, rmdirSync } from 'fs'
import { join } from 'path'

const logger = createLogger('upload:service')

/** 上传文件存储目录 */
const UPLOAD_DIR = join(process.cwd(), 'public', 'uploads')
/** 分片临时目录 */
const CHUNK_DIR = join(process.cwd(), 'public', 'chunks')

/** 哈希映射表（内存，重启后丢失；生产环境应持久化到 DB） */
const hashMap = new Map<string, string>()

/** 确保目录存在 */
for (const dir of [UPLOAD_DIR, CHUNK_DIR]) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
}

/**
 * UploadService — 文件上传 + 分片 + MD5 秒传。
 */
@Injectable()
export class UploadService {
  /**
   * 检查 MD5 秒传。
   */
  checkByMd5 = (md5: string): string | null => {
    const cached = hashMap.get(md5)
    if (cached) logger.info(`MD5 秒传命中: ${md5}`)
    return cached ?? null
  }

  /**
   * 初始化分片上传会话。
   *
   * @returns uploadId（会话目录名）+ 已完成的 chunk 索引列表
   */
  initChunks = (fileName: string, totalChunks: number, fileSize: number, md5: string) => {
    // 秒传检查
    const cacheHit = this.checkByMd5(md5)
    if (cacheHit) return { uploadId: '', completed: [], url: cacheHit, exists: true }

    const uploadId = `${Date.now()}-${md5.slice(0, 8)}`
    const dir = join(CHUNK_DIR, uploadId)
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })

    // 查已有分片
    const existing = readdirSync(dir)
      .filter(f => /^\d+$/.test(f))
      .map(Number)

    return { uploadId, completed: existing, exists: false }
  }

  /**
   * 保存单个分片（追加写入 chunk 文件）。
   */
  saveChunk = (uploadId: string, index: number, buffer: Buffer) => {
    const dir = join(CHUNK_DIR, uploadId)
    if (!existsSync(dir)) return false
    writeFileSync(join(dir, String(index)), buffer)
    return true
  }

  /**
   * 合并所有分片并登记 MD5。
   */
  mergeChunks = (uploadId: string, fileName: string, totalChunks: number, md5: string): { url: string; md5: string } | { error: string } => {
    const dir = join(CHUNK_DIR, uploadId)

    // 检查所有分片是否就绪
    for (let i = 0; i < totalChunks; i++) {
      if (!existsSync(join(dir, String(i)))) {
        return { error: `缺少分片 ${i}` }
      }
    }

    // 按序拼接
    const ext = fileName.split('.').pop() ?? 'bin'
    const filename = `${md5.slice(0, 8)}.${ext}`
    const dest = join(UPLOAD_DIR, filename)

    const writeStream = require('fs').createWriteStream(dest)
    for (let i = 0; i < totalChunks; i++) {
      const chunkBuffer = readFileSync(join(dir, String(i)))
      writeStream.write(chunkBuffer)
    }
    writeStream.end()

    // 校验 MD5
    const finalBuffer = readFileSync(dest)
    const actualMd5 = createHash('md5').update(finalBuffer).digest('hex')
    if (actualMd5 !== md5) {
      try { unlinkSync(dest) } catch { /* ignore */ }
      return { error: 'MD5 校验失败，文件损坏' }
    }

    // 注册哈希 → 清理分片目录
    const url = `/uploads/${filename}`
    hashMap.set(md5, url)

    try {
      for (let i = 0; i < totalChunks; i++) unlinkSync(join(dir, String(i)))
      rmdirSync(dir)
    } catch { /* ignore */ }

    logger.info(`分片合并完成: ${fileName} → ${filename} (${totalChunks} 片)`)
    return { url, md5 }
  }

  /**
   * 查询分片上传进度（已完成的分片索引）。
   */
  chunkStatus = (uploadId: string): number[] => {
    const dir = join(CHUNK_DIR, uploadId)
    if (!existsSync(dir)) return []
    return readdirSync(dir).filter(f => /^\d+$/.test(f)).map(Number)
  }

  /**
   * 保存上传文件并登记 MD5（全量上传兼容）。
   */
  save = (file: Express.Multer.File): { url: string; md5: string } => {
    const buffer = readFileSync(file.path)
    const md5 = createHash('md5').update(buffer).digest('hex')

    const cached = this.checkByMd5(md5)
    if (cached) return { url: cached, md5 }

    const ext = file.originalname.split('.').pop() ?? 'bin'
    const filename = `${md5.slice(0, 8)}.${ext}`
    const dest = join(UPLOAD_DIR, filename)
    writeFileSync(dest, buffer)
    try { require('fs').unlinkSync(file.path) } catch { /* ignore */ }

    const url = `/uploads/${filename}`
    hashMap.set(md5, url)
    logger.info(`文件保存: ${file.originalname} → ${filename}`)
    return { url, md5 }
  }
}
