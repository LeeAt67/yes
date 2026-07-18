import { forwardRef, useState } from 'react'
import { cn, createLogger } from '@yes/shared'
import { observer } from 'mobx-react-lite'
import { ChatInput } from './components/ChatInput'
import Welcome from './components/Welcome'
import { streamChatMessage } from '@/service/chat'
import { conversationStore } from '@/controller/instances'

const logger = createLogger('chat:page')

interface ChatPageClassNames {
  root?: string
  input?: string
}

export interface ChatPageProps {
  className?: string
  classNames?: ChatPageClassNames
}

/**
 * Chat 对话页面 — 问候语 + ChatInput 输入框 + 消息列表。
 *
 * 流式消息通过 conversationStore.appendToken 实时输出。
 */
const ChatPage = forwardRef<HTMLDivElement, ChatPageProps>(
  ({ className, classNames }, ref) => {
    const [inputValue, setInputValue] = useState('')
    const { messages, streaming, conversationId } = conversationStore

    /** 发送消息 — 调用流式 API，token 实时追加到 store */
    const handleSend = async () => {
      const query = inputValue.trim()
      if (!query || streaming) return

      logger.info('Sending:', query)
      setInputValue('')

      // 用户消息先入 store
      conversationStore.addMessage({ role: 'user', content: query })
      // AI 占位消息（流式追加）
      conversationStore.addMessage({ role: 'assistant', content: '' })
      conversationStore.streaming = true

      await streamChatMessage(query, (token) => {
        conversationStore.appendToken(token)
      }, {
        conversationId,
      })

      conversationStore.streaming = false
    }

    return (
      <div
        ref={ref}
        className={cn(
          'flex h-full flex-col',
          classNames?.root,
          className,
        )}
      >
        {/* 消息列表（有消息时滚动显示） */}
        {messages.length > 0 ? (
          <div className="flex-1 overflow-y-auto px-4 py-6">
            <div className="mx-auto max-w-2xl space-y-6">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    'flex',
                    msg.role === 'user' ? 'justify-end' : 'justify-start',
                  )}
                >
                  <div
                    className={cn(
                      'max-w-[80%] rounded-xl px-4 py-3 text-sm leading-6',
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-foreground',
                      !msg.content && 'italic text-muted-foreground',
                    )}
                  >
                    {msg.content || (conversationStore.streaming && msg.role === 'assistant' ? '思考中…' : '')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center px-4">
            <Welcome />
          </div>
        )}

        {/* 输入框 */}
        <div
          className={cn(
            'px-4 pb-6',
            messages.length === 0 ? '' : 'border-t pt-4',
          )}
        >
          <div className={cn('mx-auto max-w-xl', classNames?.input)}>
            <ChatInput
              value={inputValue}
              onValueChange={setInputValue}
              onSend={handleSend}
              loading={streaming}
              disabled={streaming}
              placeholder="输入您的问题，Enter 发送，Shift+Enter 换行"
            />
          </div>
        </div>
      </div>
    )
  },
)

ChatPage.displayName = 'ChatPage'
export default observer(ChatPage)
