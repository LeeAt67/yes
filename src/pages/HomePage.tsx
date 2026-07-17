import { useState } from 'react'
import { ChatInput } from '@/components/kui'

export default function HomePage() {
  const [inputValue, setInputValue] = useState('')

  const handleSend = () => {
    if (!inputValue.trim()) return
    alert(`消息已发送: ${inputValue}`)
    setInputValue('')
  }

  // 根据时段显示问候
  const hour = new Date().getHours()
  const greeting = hour < 12 ? '早上好' : hour < 18 ? '下午好' : '晚上好'

  return (
    <div className="flex h-full flex-col items-center justify-center px-4">
      {/* 问候语 */}
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          {greeting}，今天想做什么？
        </h1>
      </div>

      {/* 输入框 */}
      <div className="w-full max-w-xl">
        <ChatInput
          value={inputValue}
          onValueChange={setInputValue}
          onSend={handleSend}
          placeholder="输入您的问题，Enter 发送，Shift+Enter 换行"
        />
      </div>
    </div>
  )
}
