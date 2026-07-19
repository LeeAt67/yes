import { makeAutoObservable, runInAction } from 'mobx'
import { createLogger } from '@yes/shared'
import { api } from '@/service/api'

const logger = createLogger('store:conversation')

/** localStorage key：服务端对话 ID 映射 */
const CONV_ID_KEY = 'chat-conversation-id'

/** 从 localStorage 恢复会话 ID，无则生成新 ID */
const restoreConvId = (): string => {
  const saved = localStorage.getItem(CONV_ID_KEY)
  if (saved) return saved
  const newId = crypto.randomUUID()
  localStorage.setItem(CONV_ID_KEY, newId)
  return newId
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
 * 对话消息 Store。
 *
 * 消息持久化到后端 SQLite（通过 /api/chat-history），
 * 页面初始化时调用 loadConversation() 从 DB 恢复。
 */
class ConversationStore {
  messages: MessageItem[] = []
  /** 会话 ID — 多轮对话复用，刷新后从 localStorage 恢复 */
  conversationId: string = restoreConvId()
  /** 是否正在加载 */
  streaming = false
  /** 历史记录是否已从服务端加载 */
  loaded = false

  /** 防抖持久化 timer（流式 appendToken 期间合并写入） */
  private _saveTimer: ReturnType<typeof setTimeout> | null = null

  constructor() {
    makeAutoObservable(this)
  }

  /** 获取最新一条消息 */
  get latestMessage(): MessageItem | undefined {
    return this.messages[this.messages.length - 1]
  }

  /**
   * 从服务端加载指定会话的历史消息。
   *
   * 页面初始化 / 切换会话时调用。
   *
   * @param convId - 会话 ID，默认使用当前 conversationId
   */
  loadConversation = async (convId?: string) => {
    const cid = convId ?? this.conversationId
    const [data, err] = await api.get<{ messages: ApiMessage[] }>(
      `/api/chat-history/${cid}`,
    )
    if (err) {
      logger.warn('加载聊天历史失败:', err.message)
      return
    }
    if (data && data.messages.length > 0) {
      runInAction(() => {
        this.messages = data.messages.map(m => ({
          id: m.id,
          role: m.role as 'user' | 'assistant',
          content: m.content,
          createdAt: m.createdAt,
        }))
        this.conversationId = cid
      })
    }
    runInAction(() => {
      this.loaded = true
    })
  }

  /** 添加一条完整消息 */
  addMessage = (msg: Omit<MessageItem, 'id' | 'createdAt'>) => {
    this.messages.push({
      ...msg,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
    })
    this._debouncedPersist()
  }

  /** 追加 token 到最新一条 assistant 消息末尾 */
  appendToken = (token: string) => {
    const last = this.messages[this.messages.length - 1]
    if (last && last.role === 'assistant') {
      last.content += token
      this._debouncedPersist()
    }
  }

  /** 开始新一轮对话 */
  newConversation = () => {
    this.messages = []
    this.conversationId = crypto.randomUUID()
    localStorage.setItem(CONV_ID_KEY, this.conversationId)
    this._persist()
  }

  clearMessages = () => {
    this.messages = []
    this._persist()
  }

  /** 移除最后 n 条消息（用于 401 等发送失败回滚） */
  removeLastMessages = (n: number) => {
    this.messages = this.messages.slice(0, -n)
    this._persist()
  }

  // ── 内部 ──

  /**
   * 去抖持久化（200ms），流式 appendToken 高频调用时合并为单次写入。
   */
  private _debouncedPersist = () => {
    if (this._saveTimer !== null) return
    this._saveTimer = setTimeout(() => {
      this._saveTimer = null
      this._persist()
    }, 200)
  }

  /** 立即写入服务端 */
  private _persist = async () => {
    if (this.messages.length === 0) {
      // 空消息 → 删除会话记录
      await api.delete(`/api/chat-history/${this.conversationId}`)
      return
    }
    const payload = {
      messages: this.messages.map(m => ({
        role: m.role,
        content: m.content,
        createdAt: m.createdAt,
      })),
    }
    const [, err] = await api.put(
      `/api/chat-history/${this.conversationId}`,
      payload,
    )
    if (err) {
      logger.warn('保存聊天历史失败:', err.message)
    }
  }
}

export default ConversationStore
