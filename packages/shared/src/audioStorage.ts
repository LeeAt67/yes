/**
 * IndexedDB 音频存储管理器。
 *
 * 用于存储和管理音频文件数据，避免 localStorage 容量限制问题。
 * 支持 TTL 过期清理、容量限制和 LRU 淘汰策略。
 *
 * 用法：
 *   const storage = new AudioStorage({ maxDays: 7, maxSizeMB: 50 })
 *   const id = await storage.saveAudio(blob)
 *   const blob = await storage.getAudio(id)
 *   await storage.deleteAudio(id)
 */

import { createLogger } from './logger'

const logger = createLogger('shared:audio-storage')

/** 单条音频存储记录 */
interface AudioRecord {
  /** 音频唯一标识符 */
  id: string
  /** 音频文件数据 */
  audioBlob: Blob
  /** 创建时间戳（毫秒） */
  createdAt: number
  /** 最后访问时间戳（毫秒） */
  lastAccessedAt: number
  /** 音频文件大小（字节） */
  size: number
  /** 音频时长（秒，可选） */
  duration?: number
}

/** AudioStorage 构造函数可选项 */
interface AudioStorageOptions {
  /** 数据库名称，默认 "DemoAudioDB" */
  dbName?: string
  /** 数据库版本，默认 1 */
  version?: number
  /** 存储对象名称，默认 "audioFiles" */
  storeName?: string
  /** 最大存储天数，超过后自动清理，默认 30 天 */
  maxDays?: number
  /** 最大存储大小（MB），超出后触发 LRU 淘汰，默认 100MB */
  maxSizeMB?: number
}

/**
 * IndexedDB 音频存储管理器。
 *
 * 核心特性：
 * - TTL 过期清理：超过 maxDays 未访问的音频自动删除
 * - 容量限制：总大小超过 maxSizeMB 时触发 LRU 淘汰
 * - LRU 淘汰：优先删除最久未访问的音频，直到满足容量要求
 */
export class AudioStorage {
  private db: IDBDatabase | null = null
  private readonly dbName: string
  private readonly version: number
  private readonly storeName: string
  private readonly maxDays: number
  private readonly maxSizeMB: number
  /** 当前连接上的初始化 Promise，避免并发重复打开 */
  private dbPromise: Promise<IDBDatabase> | null = null

  constructor(options: AudioStorageOptions = {}) {
    this.dbName = options.dbName ?? 'DemoAudioDB'
    this.version = options.version ?? 1
    this.storeName = options.storeName ?? 'audioFiles'
    this.maxDays = options.maxDays ?? 30
    this.maxSizeMB = options.maxSizeMB ?? 100
  }

  // ============================================================
  // 公开 API
  // ============================================================

  /**
   * 存储音频文件。
   *
   * 保存后自动检查容量，超出 maxSizeMB 时触发 LRU 淘汰。
   *
   * @param audioBlob - 音频 Blob 数据
   * @param id - 可选的音频 ID，不提供则自动生成
   * @param duration - 可选的音频时长（秒）
   * @returns 音频文件的唯一标识符
   */
  saveAudio = async (audioBlob: Blob, id?: string, duration?: number): Promise<string> => {
    const db = await this.initDB()
    const audioId = id ?? this.generateAudioId()
    const now = Date.now()

    const audioRecord: AudioRecord = {
      id: audioId,
      audioBlob,
      createdAt: now,
      lastAccessedAt: now,
      size: audioBlob.size,
      duration,
    }

    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)
      const request = store.put(audioRecord)

      request.onsuccess = () => resolve()
      request.addEventListener('error', () => {
        reject(new Error(`Failed to save audio: ${request.error?.message}`))
      })
    })

    logger.debug(`Saved audio ${audioId}, size=${audioBlob.size} bytes`)
    // 自动检查容量并触发 LRU 淘汰
    await this.ensureCapacity()
    return audioId
  }

  /**
   * 获取音频文件。
   *
   * 每次访问会更新 lastAccessedAt，影响 TTL 过期和 LRU 淘汰优先级。
   *
   * @param id - 音频文件标识符
   * @returns 音频 Blob 数据，不存在时返回 null
   */
  getAudio = async (id: string): Promise<Blob | null> => {
    const db = await this.initDB()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)
      const request = store.get(id)

      request.onsuccess = () => {
        const record = request.result as AudioRecord | undefined
        if (record) {
          // 更新最后访问时间，影响 LRU 排序
          record.lastAccessedAt = Date.now()
          store.put(record)
          resolve(record.audioBlob)
        } else {
          resolve(null)
        }
      }

      request.addEventListener('error', () => {
        reject(new Error(`Failed to get audio: ${request.error?.message}`))
      })
    })
  }

  /**
   * 删除指定音频文件。
   *
   * @param id - 音频文件标识符
   * @returns 是否删除成功
   */
  deleteAudio = async (id: string): Promise<boolean> => {
    const db = await this.initDB()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)
      const request = store.delete(id)

      request.onsuccess = () => {
        logger.debug(`Deleted audio ${id}`)
        resolve(true)
      }
      request.addEventListener('error', () => {
        reject(new Error(`Failed to delete audio: ${request.error?.message}`))
      })
    })
  }

  /**
   * 检查音频文件是否存在。
   *
   * @param id - 音频文件标识符
   * @returns 文件是否存在
   */
  hasAudio = async (id: string): Promise<boolean> => {
    const db = await this.initDB()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readonly')
      const store = transaction.objectStore(this.storeName)
      const request = store.count(id)

      request.onsuccess = () => resolve(request.result > 0)
      request.addEventListener('error', () => {
        reject(new Error(`Failed to check audio existence: ${request.error?.message}`))
      })
    })
  }

  /**
   * 清理过期的音频文件（超过 maxDays 未访问）。
   *
   * @returns 清理的文件数量
   */
  cleanupExpired = async (): Promise<number> => {
    const db = await this.initDB()
    const cutoffTime = Date.now() - this.maxDays * 24 * 60 * 60 * 1000

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)
      const index = store.index('lastAccessedAt')
      const request = index.openCursor(IDBKeyRange.upperBound(cutoffTime))

      let deletedCount = 0

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result
        if (cursor) {
          cursor.delete()
          deletedCount++
          cursor.continue()
        } else {
          if (deletedCount > 0) {
            logger.info(`Cleaned up ${deletedCount} expired audio file(s)`)
          }
          resolve(deletedCount)
        }
      }

      request.addEventListener('error', () => {
        reject(new Error(`Failed to cleanup expired audios: ${request.error?.message}`))
      })
    })
  }

  /**
   * 获取存储统计信息。
   *
   * @returns 包含文件数量和总大小的统计对象
   */
  getStats = async (): Promise<{ count: number; totalSize: number }> => {
    const db = await this.initDB()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readonly')
      const store = transaction.objectStore(this.storeName)
      const request = store.getAll()

      request.onsuccess = () => {
        const records = request.result as AudioRecord[]
        resolve({
          count: records.length,
          totalSize: records.reduce((sum, r) => sum + r.size, 0),
        })
      }

      request.addEventListener('error', () => {
        reject(new Error(`Failed to get stats: ${request.error?.message}`))
      })
    })
  }

  /**
   * 关闭数据库连接并释放资源。
   */
  close = (): void => {
    if (this.db) {
      this.db.close()
      this.db = null
      this.dbPromise = null
    }
  }

  // ============================================================
  // 容量管理 & LRU 淘汰
  // ============================================================

  /**
   * 确保存储容量不超出上限。
   *
   * 当总大小超出 maxSizeMB 时，按 LRU（最近最少使用）策略逐出条目，
   * 直到总大小降到上限以下。
   *
   * @returns 被逐出的条目数量
   */
  ensureCapacity = async (): Promise<number> => {
    const maxBytes = this.maxSizeMB * 1024 * 1024
    const db = await this.initDB()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)
      const request = store.getAll()

      request.onsuccess = () => {
        const records = request.result as AudioRecord[]
        let totalSize = records.reduce((sum, r) => sum + r.size, 0)
        let evictedCount = 0

        if (totalSize <= maxBytes) {
          resolve(0)
          return
        }

        // 按 lastAccessedAt 升序排列（最久未访问的在前）
        const sorted = [...records].sort((a, b) => a.lastAccessedAt - b.lastAccessedAt)

        for (const record of sorted) {
          if (totalSize <= maxBytes) break
          store.delete(record.id)
          totalSize -= record.size
          evictedCount++
          logger.debug(`LRU evicted audio ${record.id}, freed ${record.size} bytes`)
        }

        if (evictedCount > 0) {
          logger.warn(
            `LRU eviction complete: removed ${evictedCount} file(s), ` +
            `freed ${(maxBytes - totalSize).toLocaleString()} bytes`,
          )
        }

        resolve(evictedCount)
      }

      request.addEventListener('error', () => {
        reject(new Error(`Failed to ensure capacity: ${request.error?.message}`))
      })
    })
  }

  // ============================================================
  // 内部方法
  // ============================================================

  /**
   * 初始化数据库连接（懒加载，连接复用）。
   *
   * @returns 已打开的 IDBDatabase 实例
   */
  private readonly initDB = async (): Promise<IDBDatabase> => {
    if (this.db) return this.db
    // 避免并发重复打开
    if (this.dbPromise) return this.dbPromise

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version)

      request.addEventListener('error', () => {
        this.dbPromise = null
        reject(new Error(`Failed to open IndexedDB: ${request.error?.message}`))
      })

      request.onsuccess = () => {
        this.db = request.result
        this.db.addEventListener('close', () => {
          this.db = null
          logger.warn('IndexedDB connection closed unexpectedly')
        })
        resolve(this.db)
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id' })
          store.createIndex('createdAt', 'createdAt', { unique: false })
          store.createIndex('lastAccessedAt', 'lastAccessedAt', { unique: false })
          store.createIndex('size', 'size', { unique: false })
        }
      }
    })

    return this.dbPromise
  }

  /**
   * 生成音频文件唯一标识符。
   *
   * @returns 格式为 `audio_{timestamp}_{random}` 的唯一 ID
   */
  private readonly generateAudioId = (): string =>
    `audio_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

/** 全局单例，默认 100MB / 30 天 */
export const audioStorage = new AudioStorage()
