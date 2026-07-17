import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * PromptTextarea — 自动撑高文本域。
 *
 * 透明背景、无边框、自动根据内容增高。
 */
export interface PromptTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** 输入值 */
  value: string
  /** 值变化回调 */
  onValueChange: (value: string) => void
  /** 最小行数，默认 1 */
  minRows?: number
  /** 最大行数，默认 6 */
  maxRows?: number
}

const PromptTextarea = React.forwardRef<HTMLTextAreaElement, PromptTextareaProps>(
  (
    { className, value, onValueChange, minRows = 1, maxRows = 6, placeholder, onChange, ...props },
    ref,
  ) => {
    const textareaRef = React.useRef<HTMLTextAreaElement | null>(null)

    /** 合并 ref */
    React.useImperativeHandle(ref, () => textareaRef.current!, [])

    /** 自动调整高度 */
    const adjustHeight = React.useCallback(() => {
      const ta = textareaRef.current
      if (!ta) return
      ta.style.height = 'auto'
      const lineHeight = Number.parseFloat(getComputedStyle(ta).lineHeight) || 24
      const minH = lineHeight * minRows
      const maxH = lineHeight * maxRows
      const scrollH = ta.scrollHeight
      ta.style.height = `${Math.min(Math.max(scrollH, minH), maxH)}px`
      ta.style.overflowY = scrollH > maxH ? 'auto' : 'hidden'
    }, [minRows, maxRows])

    React.useEffect(() => {
      adjustHeight()
    }, [value, adjustHeight])

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onValueChange(e.target.value)
      onChange?.(e)
    }

    // 处理回车发送
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        // 触发自定义发送事件
        const sendEvent = new CustomEvent('prompt-send', { bubbles: true })
        e.currentTarget.dispatchEvent(sendEvent)
      }
    }

    return (
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        rows={minRows}
        placeholder={placeholder}
        className={cn(
          'w-full resize-none border-0 bg-transparent px-4 py-3',
          'text-sm leading-6 placeholder:text-muted-foreground/60',
          'focus:outline-none focus:ring-0',
          className,
        )}
        {...props}
      />
    )
  },
)
PromptTextarea.displayName = 'PromptTextarea'

export { PromptTextarea }
