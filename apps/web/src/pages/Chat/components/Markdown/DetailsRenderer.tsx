import { useState } from 'react'
import { Brain } from 'lucide-react'
import { cn } from '@yes/shared'

interface DetailsRendererProps extends React.HTMLAttributes<HTMLDetailsElement> {
  type?: string
  done?: string
  duration?: string
  collapsible?: string
}

/**
 * 思考面板渲染器 — 处理 `<details type="reasoning">` 块。
 *
 * - done="true"：思考完成，可折叠
 * - done="false"：思考中，默认展开
 * - duration：思考耗时（秒）
 */
const DetailsRenderer = ({
  type,
  done,
  duration,
  children,
  ...props
}: DetailsRendererProps) => {
  const isReasoning = type === 'reasoning'
  const isCompleted = done === 'true'
  const seconds = Number.parseFloat(duration ?? '0')
  const [open, setOpen] = useState(!isCompleted)

  if (!isReasoning) {
    // 非 reasoning 类型：透传
    return <details {...props}>{children}</details>
  }

  const summary = isCompleted
    ? seconds > 0
      ? `思考完成（${seconds.toFixed(1)}s）`
      : '思考完成'
    : '思考中...'

  return (
    <details
      className="my-2 rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50"
      open={open}
      onToggle={e => setOpen(e.currentTarget.open)}
    >
      <summary
        className={cn(
          'flex cursor-pointer items-center gap-2 px-4 py-2 text-sm text-gray-500 select-none',
          'dark:text-gray-400',
        )}
      >
        <Brain className="h-4 w-4 shrink-0" />
        <span>{summary}</span>
      </summary>
      <div className="px-4 pb-3 text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
        {children}
      </div>
    </details>
  )
}

export default DetailsRenderer
