import { makeAutoObservable, runInAction } from 'mobx'
import { createLogger } from '@yes/shared'
import { api } from '@/service/api'

const logger = createLogger('store:conversation')

/** localStorage key：当前活跃会话 ID */
const ACTIVE_CONV_KEY = 'chat-active-conversation'

/** 会话摘要 */
export interface ConversationSummary {
  id: string
  title: string
  createdAt: number
  updatedAt: number
}

/** 单条消息 */
export interface MessageItem {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: number
}

/** API 返回的消息格式 */
interface ApiMessage {
  id: string
  role: string
  content: string
  createdAt: number
}

/**
 * 对话消息 Store — 多会话支持。
 *
 * - 会话列表从服务端加载（/api/conversations）
 * - 消息按 conversationId 隔离存储
 * - 活跃会话 ID 持久化到 localStorage，刷新/登录后恢复
 */
class ConversationStore {
  /** 当前活跃会话 ID */
  activeId: string | null = null
  /** 会话列表 */
  list: ConversationSummary[] = []
  /** 当前会话消息 */
  messages: MessageItem[] = []
  /** 是否正在加载 */
  streaming = false
  /** 是否已加载 */
  loaded = false

  /** 防抖持久化 timer */
  private _saveTimer: ReturnType<typeof setTimeout> | null = null

  constructor() {
    makeAutoObservable(this)
  }

  /** 获取最新一条消息 */
  get latestMessage(): MessageItem | undefined {
    return this.messages[this.messages.length - 1]
  }

  // ── 会话管理 ──

  /**
   * 从服务端加载会话列表 + 恢复活跃会话。
   *
   * 页面初始化时调用。
   */
  loadConversationList = async () => {
    const [data, err] = await api.get<{ list: ConversationSummary[] }>(
      '/api/conversations',
    )
    if (err) {
      logger.warn('加载会话列表失败:', err.message)
      return
    }
    runInAction(() => {
      this.list = data?.list ?? []

      // 恢复上次活跃会话（localStorage → 服务端列表交叉验证）
      const savedId = localStorage.getItem(ACTIVE_CONV_KEY)
      if (savedId && this.list.some(c => c.id === savedId)) {
        this.activeId = savedId
        this._loadMessages(savedId)
      } else if (this.list.length > 0) {
        this.activeId = this.list[0].id
        localStorage.setItem(ACTIVE_CONV_KEY, this.list[0].id)
        this._loadMessages(this.list[0].id)
      } else {
        // 无会话 → 自动创建第一个
        this.newConversation()
      }
      this.loaded = true
    })
  }

  /** 切换到指定会话 */
  switchConversation = (id: string) => {
    if (id === this.activeId) return
    this._persistSync()  // 保存当前会话再切换
    this.activeId = id
    localStorage.setItem(ACTIVE_CONV_KEY, id)
    this._loadMessages(id)
  }

  /** 创建新会话 */
  newConversation = () => {
    if (this.activeId && this.messages.length === 0) return  // 已在空会话

    this._persistSync()
    const id = crypto.randomUUID()
    const title = '新对话'

    // 乐观更新列表
    runInAction(() => {
      this.list.unshift({
        id,
        title,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
      this.activeId = id
      this.messages = []
    })

    localStorage.setItem(ACTIVE_CONV_KEY, id)
    // 后台写入服务端
    api.post('/api/conversations', { id, title })
  }

  /** 删除指定会话 */
  removeConversation = (id: string) => {
    const idx = this.list.findIndex(c => c.id === id)
    if (idx === -1) return

    this.list.splice(idx, 1)

    if (id === this.activeId) {
      this.messages = []
      if (this.list.length > 0) {
        this.switchConversation(this.list[0].id)
      } else {
        this.activeId = null
        localStorage.removeItem(ACTIVE_CONV_KEY)
      }
    }

    api.delete(`/api/conversations/${id}`)
  }

  // ── 消息操作 ──

  /** 添加完整消息，自动更新会话标题（取第一条用户消息） */
  addMessage = (msg: Omit<MessageItem, 'id' | 'createdAt'>) => {
    this.messages.push({
      ...msg,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
    })
    // 第一条用户消息 → 更新会话标题
    if (msg.role === 'user' && this.activeId) {
      const conv = this.list.find(c => c.id === this.activeId)
      if (conv) {
        const title = msg.content.slice(0, 30)
        conv.title = title
        conv.updatedAt = Date.now()
        api.put(`/api/conversations/${this.activeId}/touch`, { title })
      }
    }
  }

  /** 追加 token（仅在内存累积，不触发持久化） */
  appendToken = (token: string) => {
    const last = this.messages[this.messages.length - 1]
    if (last && last.role === 'assistant') {
      last.content += token
    }
  }

  /** 移除最后 n 条消息（401 回滚） */
  removeLastMessages = (n: number) => {
    this.messages = this.messages.slice(0, -n)
    this._persist()
  }

  clearMessages = () => {
    this.messages = []
    this._persist()
  }

  /**
   * 流式结束后调用，保存完整对话到后端。
   */
  saveMessages = async () => {
    if (!this.activeId || this.messages.length === 0) return
    await api.post('/api/chat/save', {
      conversationId: this.activeId,
      messages: this.messages.map(m => ({
        role: m.role,
        content: m.content,
        createdAt: m.createdAt,
      })),
    })
  }

  // ── 内部 ──

  /** 从服务端加载指定会话的消息 */
  private _loadMessages = async (convId: string) => {
    const [data, err] = await api.get<{ messages: ApiMessage[] }>(
      `/api/chat-history/${convId}`,
    )
    if (err) {
      logger.warn('加载消息失败:', err.message)
      runInAction(() => { this.messages = [] })
      return
    }
    runInAction(() => {
      this.messages = (data?.messages ?? []).map(m => ({
        id: m.id,
        role: m.role as 'user' | 'assistant',
        content: m.content,
        createdAt: m.createdAt,
      }))
    })
  }

  private _debouncedPersist = () => {
    if (this._saveTimer !== null) return
    this._saveTimer = setTimeout(() => {
      this._saveTimer = null
      this._persist()
    }, 200)
  }

  private _persist = async () => {
    if (!this.activeId) return
    if (this.messages.length === 0) {
      await api.delete(`/api/chat-history/${this.activeId}`)
      return
    }
    await api.post('/api/chat/save', {
      conversationId: this.activeId,
      messages: this.messages.map(m => ({
        role: m.role,
        content: m.content,
        createdAt: m.createdAt,
      })),
    }).catch(() => {})
  }

  /** 同步版本（切换/新建会话前立即保存，不等待防抖） */
  private _persistSync = () => {
    this._persist()
  }
}

export default ConversationStore
