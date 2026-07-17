import * as React from 'react'
import { cn } from '@/lib/utils'
import { PromptTextarea } from './PromptTextarea'
import { InputToolbar } from './InputToolbar'

/**
 * ChatInput — Claude 风格输入框。
 *
 * 组装 PromptTextarea + InputToolbar。
 */
export interface ChatInputProps {
  /** 输入值 */
  value: string
  /** 值变化 */
  onValueChange: (value: string) => void
  /** 发送回调 */
  onSend: () => void
  /** 占位文本 */
  placeholder?: string
  /** 是否加载中 */
  loading?: boolean
  /** 是否禁用 */
  disabled?: boolean
  /** 最大字符数 */
  maxLength?: number
  // 模型选择
  model?: string
  models?: readonly string[]
  onModelSelect?: (model: string) => void
  // 语音
  onVoiceToggle?: () => void
  recording?: boolean
  // 附件
  onAttach?: () => void
  // 设置
  onSettings?: () => void
  /** 外框类名 */
  className?: string
}

const ChatInput: React.FC<ChatInputProps> = ({
  value,
  onValueChange,
  onSend,
  placeholder = '输入您的问题，Enter 发送，Shift+Enter 换行',
  loading = false,
  disabled = false,
  maxLength = 4000,
  model = 'Sonnet 5 Medium',
  models = ['Sonnet 5 Medium', 'Sonnet 5 Fast', 'Opus 5'],
  onModelSelect = () => {},
  onVoiceToggle = () => {},
  recording = false,
  onAttach = () => {},
  onSettings = () => {},
  className,
}) => {
  const containerRef = React.useRef<HTMLDivElement>(null)

  // 监听自定义发送事件
  React.useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const handler = () => {
      if (value.trim() && !loading) onSend()
    }
    container.addEventListener('prompt-send', handler)
    return () => container.removeEventListener('prompt-send', handler)
  }, [value, loading, onSend])

  const canSend = value.trim().length > 0 && !disabled

  /** 附件上传 — 触发文件选择 */
  const handleAttach = () => {
    // TODO: 接入实际文件上传逻辑（创建隐藏 input[type=file]，支持图片/文档）
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*,.pdf,.doc,.docx'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        console.log('[ChatInput] 附件已选择:', file.name)
        // TODO: 上传文件并回调 onAttach
      }
    }
    input.click()
    onAttach()
  }

  /** 语音切换 */
  const handleVoiceToggle = () => {
    // TODO: 接入语音 SDK（Web Speech API / LiveKit），启动/停止录音
    console.log('[ChatInput] 语音切换，当前状态:', recording)
    onVoiceToggle()
  }

  /** 设置 */
  const handleSettings = () => {
    // TODO: 打开设置面板（模型参数、对话选项等）
    console.log('[ChatInput] 打开设置')
    onSettings()
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative rounded-2xl border bg-card shadow-sm',
        'transition-shadow focus-within:shadow-md focus-within:ring-1 focus-within:ring-ring/20',
        disabled && 'opacity-60 pointer-events-none',
        className,
      )}
    >
      {/* 输入区 */}
      <PromptTextarea
        value={value}
        onValueChange={onValueChange}
        placeholder={placeholder}
        maxLength={maxLength}
        disabled={disabled}
        className="min-h-[44px]"
      />

      {/* 工具栏 */}
      <InputToolbar
        model={model}
        models={models}
        onModelSelect={onModelSelect}
        recording={recording}
        onVoiceToggle={onVoiceToggle}
        canSend={canSend}
        loading={loading}
        onSend={onSend}
        onAttach={handleAttach}
        onSettings={handleSettings}
      />
    </div>
  )
}
ChatInput.displayName = 'ChatInput'

export { ChatInput }
