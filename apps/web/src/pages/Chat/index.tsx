import { forwardRef, useState, useEffect, useRef, useCallback } from 'react'
import { cn, createLogger } from '@yes/shared'
import { observer } from 'mobx-react-lite'
import { ChatInput } from './components/ChatInput'
import Welcome from './components/Welcome'
import Markdown from './components/Markdown'
import { streamChatMessage } from '@/service/chat'
import { setApiToken, api } from '@/service/api'
import { conversationStore, authStore } from '@/controller/instances'

const logger = createLogger('chat:page')

const DEFAULT_MODELS = ['deepseek-v4-pro', 'deepseek-v4-flash']

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
    const [model, setModel] = useState('deepseek-v4-pro')
    const [models, setModels] = useState<string[]>(DEFAULT_MODELS)
    const { messages, streaming, conversationId } = conversationStore
    const abortRef = useRef<AbortController | null>(null)

    // 从后端拉取模型列表
    useEffect(() => {
      api.get<Array<{ id: string }>>('/api/models').then(([data]) => {
        if (data && data.length > 0) setModels(data.map((m) => m.id))
      })
    }, [])

    /** 发送消息 — 调用流式 API，token 实时追加到 store */
    const handleSend = useCallback(async () => {
      const query = inputValue.trim()
      if (!query || streaming) return

      logger.info('Sending:', { query, model })
      setInputValue('')

      // 同步 auth token
      setApiToken(authStore.accessToken)

      // 创建 AbortController，用于取消
      const controller = new AbortController()
      abortRef.current = controller

      // 用户消息先入 store
      conversationStore.addMessage({ role: 'user', content: query })
      // AI 占位消息（流式追加）
      conversationStore.addMessage({ role: 'assistant', content: '' })
      conversationStore.streaming = true

      await streamChatMessage(query, (token) => {
        conversationStore.appendToken(token)
      }, {
        conversationId,
        modelConfig: { model },
        signal: controller.signal,
      })

      // 请求完毕后清理
      abortRef.current = null
      conversationStore.streaming = false
    }, [inputValue, streaming, model, conversationId])

    /** 停止生成 — 中断当前流式请求 */
    const handleStop = useCallback(() => {
      if (abortRef.current) {
        abortRef.current.abort()
        abortRef.current = null
      }
    }, [])

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
                  {msg.role === 'user' ? (
                    <div className="max-w-[80%] rounded-xl bg-primary px-4 py-3 text-sm leading-6 text-primary-foreground">
                      {msg.content}
                    </div>
                  ) : (
                    <div className="max-w-[80%] rounded-xl bg-muted px-4 py-3 text-sm leading-6 text-foreground">
                      {msg.content ? (
                        <Markdown
                          content={msg.content}
                          isTyping={streaming && msg.role === 'assistant'}
                          blockMode
                        />
                      ) : streaming ? (
                        <span className="italic text-muted-foreground">思考中…</span>
                      ) : null}
                    </div>
                  )}
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
              onStop={handleStop}
              loading={streaming}
              placeholder="输入您的问题，Enter 发送，Shift+Enter 换行"
              model={model}
              models={models}
              onModelSelect={setModel}
            />
          </div>
        </div>
      </div>
    )
  },
)

ChatPage.displayName = 'ChatPage'
export default observer(ChatPage)
