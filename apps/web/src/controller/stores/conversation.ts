import { makeAutoObservable } from 'mobx'

/** 单条消息 */
export interface MessageItem {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: number
}

/**
 * 对话消息 Store。
 */
class ConversationStore {
  messages: MessageItem[] = []
  /** 会话 ID — 多轮对话复用 */
  conversationId = crypto.randomUUID()
  /** 是否正在加载 */
  streaming = false

  constructor() {
    makeAutoObservable(this)
  }

  /** 获取最新一条消息 */
  get latestMessage(): MessageItem | undefined {
    return this.messages[this.messages.length - 1]
  }

  /** 添加一条完整消息 */
  addMessage = (msg: Omit<MessageItem, 'id' | 'createdAt'>) => {
    this.messages.push({
      ...msg,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
    })
  }

  /** 追加 token 到最新一条 assistant 消息末尾 */
  appendToken = (token: string) => {
    const last = this.messages[this.messages.length - 1]
    if (last && last.role === 'assistant') {
      last.content += token
    }
  }

  /** 开始新一轮对话 */
  newConversation = () => {
    this.messages = []
    this.conversationId = crypto.randomUUID()
  }

  clearMessages = () => {
    this.messages = []
  }

  /** 移除最后 n 条消息（用于 401 等发送失败回滚） */
  removeLastMessages = (n: number) => {
    this.messages = this.messages.slice(0, -n)
  }
}

export default ConversationStore
