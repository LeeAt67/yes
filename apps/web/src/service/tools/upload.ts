import { createLogger } from '@yes/shared'
import type { MediaItem } from '@/controller/stores/media'

const logger = createLogger('tools:upload')

/** 单分片大小：2MB */
const CHUNK_SIZE = 2 * 1024 * 1024
/** 每片最多重试次数 */
const MAX_RETRIES = 3
/** localStorage 断点续传 key 前缀 */
const RESUME_KEY = 'upload-session-'

/** 文件校验配置 */
const FILE_LIMITS = {
  /** 最大文件大小：20MB */
  maxSize: 20 * 1024 * 1024,
  /** 支持的图片类型 */
  imageTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'],
  /** 支持的文件类型 */
  fileTypes: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
  ],
  /** 最多同时上传文件数 */
  maxCount: 10,
  /** 文件名最大长度 */
  maxNameLength: 200,
} as const

/** 图片压缩配置 */
const IMAGE_COMPRESS = {
  /** 超过此尺寸（字节）才压缩 */
  minSize: 500 * 1024,
  /** 最大宽度 */
  maxWidth: 1920,
  /** 最大高度 */
  maxHeight: 1920,
  /** JPEG 品质 0-1 */
  quality: 0.8,
} as const

/** 断点续传会话 */
interface ResumeSession {
  uploadId: string
  completedChunks: number[]
  ts: number
}

/** 文件校验结果 */
export interface FileValidationError {
  message: string
}

/** 校验单个文件 */
export const validateFile = (file: File): FileValidationError | null => {
  // 大小
  if (file.size > FILE_LIMITS.maxSize) {
    return { message: `文件 "${file.name}" 超过 ${FILE_LIMITS.maxSize / 1024 / 1024}MB 限制` }
  }
  // 类型（空 type 允许，来自拖拽或某些浏览器场景）
  if (file.type !== '') {
    const isImage = (FILE_LIMITS.imageTypes as readonly string[]).includes(file.type)
    const isDoc = (FILE_LIMITS.fileTypes as readonly string[]).includes(file.type)
    if (!isImage && !isDoc) {
      return { message: `不支持的文件类型: ${file.type || '未知'}` }
    }
  }
  // 文件名长度
  if (file.name.length > FILE_LIMITS.maxNameLength) {
    return { message: '文件名过长' }
  }
  return null
}

/** 累计文件数是否超限 */
export const validateCount = (current: number, adding: number): FileValidationError | null => {
  if (current + adding > FILE_LIMITS.maxCount) {
    return { message: `最多同时上传 ${FILE_LIMITS.maxCount} 个文件` }
  }
  return null
}

/**
 * 上传文件（校验 + 压缩 + 分片 + 指数退避重试 + 断点续传）。
 */
export const uploadFile = async (
  file: File,
  onProgress: (pct: number) => void,
  onStatusChange: (status: MediaItem['status']) => void,
): Promise<{ url: string; md5: string } | null> => {
  // ① 实际压缩（图片 > 500KB 才压）
  onStatusChange('compressing')

  let uploadFile = file
  if ((FILE_LIMITS.imageTypes as readonly string[]).includes(file.type) && file.size > IMAGE_COMPRESS.minSize) {
    try {
      uploadFile = await compressImage(file)
      const saved = file.size - uploadFile.size
      if (saved > 0) {
        logger.info(`图片压缩: ${(file.size / 1024).toFixed(0)}KB → ${(uploadFile.size / 1024).toFixed(0)}KB (${Math.round(saved / file.size * 100)}%)`)
      }
    } catch (err) {
      logger.warn('图片压缩失败，使用原图:', (err as Error).message)
    }
  }

  const md5 = await computeFileHash(uploadFile)

  // ② 秒传
  const { api } = await import('@/service/api')
  const [checkResult] = await api.post<{ exists: boolean; url?: string }>('/api/upload/check', { md5 })
  if (checkResult?.exists && checkResult?.url) {
    logger.info(`MD5 秒传: ${file.name}`)
    onProgress(100)
    onStatusChange('completed')
    return { url: checkResult.url, md5 }
  }

  // ③ 分片或直传
  if (uploadFile.size <= CHUNK_SIZE) {
    onStatusChange('uploading')
    return xhrUpload(uploadFile, md5, onProgress, onStatusChange)
  }

  return chunkedUpload(uploadFile, md5, onProgress, onStatusChange)
}

/** 全量直传 */
const xhrUpload = (
  file: File,
  md5: string,
  onProgress: (pct: number) => void,
  onStatusChange: (s: MediaItem['status']) => void,
): Promise<{ url: string; md5: string } | null> =>
  new Promise((resolve) => {
    const xhr = new XMLHttpRequest()
    const fd = new FormData()
    fd.append('file', file, file.name)
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
    })
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const d = JSON.parse(xhr.responseText)
          if (d.url) { onProgress(100); onStatusChange('completed'); resolve({ url: d.url, md5: d.md5 || md5 }); return }
        } catch { }
      }
      onStatusChange('error'); resolve(null)
    })
    xhr.addEventListener('error', () => { onStatusChange('error'); resolve(null) })
    xhr.open('POST', '/api/upload')
    setAuth(xhr)
    xhr.send(fd)
  })

/** 分片上传 */
const chunkedUpload = async (
  file: File,
  md5: string,
  onProgress: (pct: number) => void,
  onStatusChange: (s: MediaItem['status']) => void,
): Promise<{ url: string; md5: string } | null> => {
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE)
  const { api } = await import('@/service/api')

  // 恢复或初始化
  let uploadId = ''
  let completedChunks: number[] = []
  const session = loadResume(md5)
  if (session) {
    const [s] = await api.post<{ completed: number[] }>('/api/upload/chunk/status', { uploadId: session.uploadId })
    if (s) { uploadId = session.uploadId; completedChunks = s.completed }
  }
  if (!uploadId) {
    const [init] = await api.post<{ uploadId: string; completed: number[]; url?: string; exists: boolean }>(
      '/api/upload/chunk/init', { fileName: file.name, totalChunks, fileSize: file.size, md5 },
    )
    if (init?.exists && init.url) { onProgress(100); onStatusChange('completed'); return { url: init.url, md5 } }
    if (!init?.uploadId) { onStatusChange('error'); return null }
    uploadId = init.uploadId
    completedChunks = init.completed
  }

  saveResume(md5, uploadId, completedChunks)
  onStatusChange('uploading')

  // 并发池：最多 CONCURRENT 片同时在传，配合指数退避重试
  const CONCURRENT = 3
  let done = completedChunks.length
  let failed = false
  const upd = () => onProgress(Math.round((done / totalChunks) * 100))
  upd()
  const running = new Set<Promise<void>>()

  for (let i = 0; i < totalChunks; i++) {
    if (completedChunks.includes(i)) continue

    // 等待空闲槽位
    while (running.size >= CONCURRENT) {
      await Promise.race(running)
      for (const p of running) {
        const w = p as Promise<void> & { _done?: boolean }
        if (w._done) running.delete(p)
      }
    }

    const idx = i
    const task = (async () => {
      const start = idx * CHUNK_SIZE
      const end = Math.min(start + CHUNK_SIZE, file.size)
      const blob = file.slice(start, end)

      let ok = false
      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        ok = await sendOneChunk(blob, uploadId, idx)
        if (ok) break
        if (attempt < MAX_RETRIES) await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000))
      }

      if (!ok) { failed = true; return }
      completedChunks.push(idx)
      done++
      saveResume(md5, uploadId, completedChunks)
      upd()
    })()

    const wrapped = task.then(() => { (task as Promise<void> & { _done?: boolean })._done = true }) as Promise<void> & { _done?: boolean }
    wrapped._done = false
    running.add(wrapped)
  }

  await Promise.all(running)

  if (failed) { onStatusChange('error'); return null }

  // 合并
  onStatusChange('compressing')
  const [merged] = await api.post<{ url?: string; md5?: string; error?: string }>(
    '/api/upload/chunk/merge', { uploadId, fileName: file.name, totalChunks, md5 },
  )
  if (merged?.error) { onStatusChange('error'); return null }
  if (merged?.url) {
    clearResume(md5)
    onProgress(100)
    onStatusChange('completed')
    return { url: merged.url, md5: merged.md5 || md5 }
  }
  onStatusChange('error')
  return null
}

/** 发送单个分片 */
const sendOneChunk = (blob: Blob, uploadId: string, index: number): Promise<boolean> =>
  new Promise((resolve) => {
    const xhr = new XMLHttpRequest()
    const fd = new FormData()
    fd.append('chunk', blob, `chunk-${index}`)
    fd.append('uploadId', uploadId)
    fd.append('index', String(index))
    xhr.addEventListener('load', () => resolve(xhr.status >= 200 && xhr.status < 300))
    xhr.addEventListener('error', () => resolve(false))
    xhr.open('POST', '/api/upload/chunk')
    setAuth(xhr)
    xhr.send(fd)
  })

/** 计算文件哈希 */
const computeFileHash = async (file: File): Promise<string> => {
  const buffer = await file.slice(0, Math.min(file.size, 64 * 1024)).arrayBuffer()
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
  const hex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 16)}-${file.size}`
}

/** XHR 加 token */
const setAuth = (xhr: XMLHttpRequest) => {
  const t = localStorage.getItem('auth-token')
  if (t) xhr.setRequestHeader('Authorization', `Bearer ${t}`)
}

// ── 图片压缩（canvas 缩放 + 品质调整，    ProcessingQueue compressImage） ──

/**
 * 客户端图片压缩。
 *
 * 策略：canvas 绘制 → 等比缩放到 maxWidth/maxHeight → JPEG quality=0.8。
 * 压缩后体积反而变大的情况（已高度优化的图片）→ 返回原文件。
 *
 * @param file - 原始图片 File
 * @returns 压缩后的 File
 */
const compressImage = async (file: File): Promise<File> => {
  const img = await loadImage(file)
  const { width, height } = calcSize(img.width, img.height, IMAGE_COMPRESS.maxWidth, IMAGE_COMPRESS.maxHeight)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0, width, height)

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/jpeg', IMAGE_COMPRESS.quality)
  })

  if (!blob) return file
  if (blob.size >= file.size) return file

  return new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' })
}

const loadImage = (file: File): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = reader.result as string
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

const calcSize = (w: number, h: number, maxW: number, maxH: number): { width: number; height: number } => {
  if (w <= maxW && h <= maxH) return { width: w, height: h }
  const ratio = Math.min(maxW / w, maxH / h)
  return { width: Math.round(w * ratio), height: Math.round(h * ratio) }
}

// ── 断点续传 ──

const loadResume = (md5: string): ResumeSession | null => {
  try {
    const r = localStorage.getItem(RESUME_KEY + md5)
    if (!r) return null
    const s: ResumeSession = JSON.parse(r)
    if (Date.now() - s.ts > 86400000) { localStorage.removeItem(RESUME_KEY + md5); return null }
    return s
  } catch { return null }
}

const saveResume = (md5: string, uploadId: string, chunks: number[]) => {
  try { localStorage.setItem(RESUME_KEY + md5, JSON.stringify({ uploadId, completedChunks: chunks, ts: Date.now() })) } catch { }
}

const clearResume = (md5: string) => { localStorage.removeItem(RESUME_KEY + md5) }

