import * as React from 'react'
import { ChevronDown } from 'lucide-react'
import { Button } from '@/components/Button'

/**
 * ModelSelector — 模型选择器
 *
 * Claude 风格：紧凑下拉按钮，左侧图标 + 名称 + 右侧箭头
 */
export interface ModelSelectorProps {
  /** 当前选中模型 */
  value: string
  /** 模型列表 */
  options: readonly string[]
  /** 选择回调 */
  onSelect: (model: string) => void
  /** 是否禁用 */
  disabled?: boolean
}

const ModelSelector: React.FC<ModelSelectorProps> = ({
  value,
  options,
  onSelect,
  disabled = false,
}) => {
  const [open, setOpen] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)

  // 点击外部关闭
  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      <Button
        variant="toolbar"
        size="sm"
        onClick={() => setOpen(!open)}
        disabled={disabled}
        className="gap-1 font-normal"
        aria-label={`Model: ${value}`}
        title={`Model: ${value}`}
      >
        <span className="text-xs">{value}</span>
        <ChevronDown className="h-3 w-3" />
      </Button>

      {open && (
        <div className="absolute bottom-full left-0 mb-1 w-48 rounded-lg border bg-popover p-1 shadow-lg animate-in fade-in zoom-in-95 z-10">
          {options.map((model) => (
            <button
              key={model}
              onClick={() => {
                onSelect(model)
                setOpen(false)
              }}
              className={`w-full rounded-md px-3 py-1.5 text-left text-sm transition-colors ${
                model === value
                  ? 'bg-accent text-accent-foreground'
                  : 'hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              {model}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
ModelSelector.displayName = 'ModelSelector'

export { ModelSelector }
