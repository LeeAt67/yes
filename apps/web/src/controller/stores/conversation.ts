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

  constructor() {
    makeAutoObservable(this)
  }

  /** 获取最新一条消息 */
  get latestMessage(): MessageItem | undefined {
    return this.messages[this.messages.length - 1]
  }

  addMessage = (msg: Omit<MessageItem, 'id' | 'createdAt'>) => {
    this.messages.push({
      ...msg,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
    })
  }

  clearMessages = () => {
    this.messages = []
  }
}

export default ConversationStore
