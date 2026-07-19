import * as React from 'react'
import { X, ExternalLink } from 'lucide-react'
import { cn } from '@yes/shared'
import type { WebSearchResult } from '@/service/chat'

export interface SearchResultPanelProps {
  /** 搜索结果列表 */
  results: WebSearchResult[]
  /** 是否打开 */
  open: boolean
  /** 关闭回调 */
  onClose: () => void
  className?: string
}

/**
 * SearchResultPanel — 搜索结果悬浮卡片。
 *
 * 从聊天区右侧浮出，不遮挡主内容区，点击外部关闭。
 */
const SearchResultPanel: React.FC<SearchResultPanelProps> = ({
  results,
  open,
  onClose,
  className,
}) => {
  const panelRef = React.useRef<HTMLDivElement>(null)

  // 点击外部关闭
  React.useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    // 延迟绑定，避免触发 click 的同一事件立即关闭
    const timer = setTimeout(() => document.addEventListener('mousedown', handler), 0)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handler)
    }
  }, [open, onClose])

  if (!open || results.length === 0) return null

  /** 打开链接（新标签页） */
  const handleOpenLink = (url?: string) => {
    if (!url) return
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <div
      ref={panelRef}
      className={cn(
        'absolute right-4 top-4 z-50 w-80 max-h-[70vh] rounded-xl border bg-background shadow-xl',
        className,
      )}
    >
      {/* 标题栏 */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h3 className="text-sm font-semibold text-foreground">
          搜索结果（{results.length}）
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* 结果列表 */}
      <div className="overflow-y-auto px-4 py-3" style={{ maxHeight: 'calc(70vh - 3.5rem)' }}>
        <ul className="space-y-2.5">
          {results.map((result, i) => (
            <li key={result.url ?? i}>
              <button
                type="button"
                onClick={() => handleOpenLink(result.url)}
                className="block w-full rounded-lg border p-2.5 text-left transition-colors hover:bg-muted/50"
              >
                <h4 className="truncate text-xs font-medium text-foreground">
                  {result.name || '无标题'}
                </h4>
                {result.snippet && (
                  <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">
                    {result.snippet}
                  </p>
                )}
                <div className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground/70">
                  <span className="truncate">{result.siteName || result.url}</span>
                  <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export default SearchResultPanel
