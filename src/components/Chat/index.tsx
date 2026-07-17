import { forwardRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { ChatInput } from '@/components/kui'
import { createLogger } from '@/utils/logger'

const logger = createLogger('chat:component')

interface ChatClassNames {
  root?: string
  heading?: string
  input?: string
}

export interface ChatProps {
  className?: string
  classNames?: ChatClassNames
}

/**
 * Chat 对话组件 — 问候语 + ChatInput 输入框。
 * Claude 风格首页核心交互。
 */
const Chat = forwardRef<HTMLDivElement, ChatProps>(
  ({ className, classNames }, ref) => {
    const [inputValue, setInputValue] = useState('')

    /** 发送消息 */
    const handleSend = () => {
      if (!inputValue.trim()) return
      logger.info('Sending:', inputValue)
      alert(`消息已发送: ${inputValue}`)
      setInputValue('')
    }

    const hour = new Date().getHours()
    const greeting = hour < 12 ? '早上好' : hour < 18 ? '下午好' : '晚上好'

    return (
      <div
        ref={ref}
        className={cn(
          'flex h-full flex-col items-center justify-center px-4',
          classNames?.root,
          className,
        )}
      >
        <div
          className={cn('mb-8 text-center', classNames?.heading)}
        >
          <h1 className="text-2xl font-semibold tracking-tight">
            {greeting}，今天想做什么？
          </h1>
        </div>

        <div className={cn('w-full max-w-xl', classNames?.input)}>
          <ChatInput
            value={inputValue}
            onValueChange={setInputValue}
            onSend={handleSend}
            placeholder="输入您的问题，Enter 发送，Shift+Enter 换行"
          />
        </div>
      </div>
    )
  },
)

Chat.displayName = 'Chat'
export default Chat
