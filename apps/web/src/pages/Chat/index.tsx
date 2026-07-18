import { forwardRef, useState } from 'react'
import { cn } from '@yes/shared'
import { ChatInput } from './components/ChatInput'
import Welcome from './components/Welcome'
import { createLogger } from '@yes/shared'

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
 * Chat 对话页面 �?问候语 + ChatInput 输入框�?
 * Claude 风格首页核心交互�?
 */
const ChatPage = forwardRef<HTMLDivElement, ChatPageProps>(
  ({ className, classNames }, ref) => {
    const [inputValue, setInputValue] = useState('')

    /** 发送消�?*/
    const handleSend = () => {
      if (!inputValue.trim()) return
      logger.info('Sending:', inputValue)
      alert(`消息已发�? ${inputValue}`)
      setInputValue('')
    }

    return (
      <div
        ref={ref}
        className={cn(
          'flex h-full flex-col items-center justify-center px-4',
          classNames?.root,
          className,
        )}
      >
        <Welcome />
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

ChatPage.displayName = 'ChatPage'
export default ChatPage
