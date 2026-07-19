import { makeAutoObservable } from 'mobx'

/**        MultiMediaStatus：单文件生命周期 */
export type MediaStatus =
  | 'pending'      // 刚选择，等待处理
  | 'compressing'  // 客户端压缩中
  | 'uploading'    // 上传中
  | 'completed'    // 上传完成
  | 'error'        // 上传失败

/** 单个媒体文件 */
export interface MediaItem {
  /** 唯一 ID */
  id: string
  /** 媒体类型 */
  mediaType: 'image' | 'file'
  /** 本地 blob URL（即时预览，   的 objectUrl） */
  objectUrl: string
  /** 服务端 URL（上传完成后填充） */
  url: string
  /** 文件名 */
  name: string
  /** 文件大小（字节） */
  size: number
  /** 生命周期状态 */
  status: MediaStatus
  /** 上传进度 0-100 */
  uploadProgress: number
  /** 错误信息 */
  errorMessage?: string
}

/** 待发送的多媒体 payload（对齐后端 multiMedias 字段） */
export interface SendableMedia {
  mediaType: 'image' | 'file'
  url: string
  name: string
  size: number
}

/**
 * MediaStore —        MediaUploader 的状态机。
 *
 * 管理当前会话的附件列表状态：
 *   pending → compressing → uploading → completed / error
 */
class MediaStore {
  /** 当前附件列表 */
  items: MediaItem[] = []

  constructor() {
    makeAutoObservable(this)
  }

  /** 添加文件（刚选择时，状态 pending） */
  addItem = (item: Omit<MediaItem, 'uploadProgress' | 'status'>): void => {
    this.items.push({
      ...item,
      uploadProgress: 0,
      status: 'pending',
    })
  }

  /** 更新单个文件状态（       的字段级更新） */
  updateItem = (id: string, patch: Partial<Pick<MediaItem, 'status' | 'uploadProgress' | 'url' | 'errorMessage'>>): void => {
    const idx = this.items.findIndex(i => i.id === id)
    if (idx === -1) return
    Object.assign(this.items[idx], patch)
  }

  /** 删除附件（同时释放 blob URL） */
  removeItem = (id: string): void => {
    const idx = this.items.findIndex(i => i.id === id)
    if (idx === -1) return
    const item = this.items[idx]
    if (item.objectUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(item.objectUrl)
    }
    this.items.splice(idx, 1)
  }

  /** 导出为发送 payload */
  toSendable = (): SendableMedia[] => {
    return this.items
      .filter(i => i.status === 'completed' && i.url)
      .map(i => ({
        mediaType: i.mediaType,
        url: i.url,
        name: i.name,
        size: i.size,
      }))
  }

  /** 重置 */
  reset = (): void => {
    for (const item of this.items) {
      if (item.objectUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(item.objectUrl)
      }
    }
    this.items = []
  }

  /** 是否有正在处理的文件 */
  get hasProcessing(): boolean {
    return this.items.some(i => ['pending', 'compressing', 'uploading'].includes(i.status))
  }

  /** 已完成的文件数 */
  get completedCount(): number {
    return this.items.filter(i => i.status === 'completed').length
  }
}

export default MediaStore
