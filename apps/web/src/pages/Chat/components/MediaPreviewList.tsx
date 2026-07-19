import * as React from 'react'
import { X, FileText, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { observer } from 'mobx-react-lite'
import { cn } from '@yes/shared'
import type { MediaItem } from '@/controller/stores/media'

/**
 * MediaPreviewItem —        FileItem。
 *
 * 单文件预览卡片：
 * - 图片：缩略图
 * - 其他文件：图标 + 文件名
 * - uploading：进度条 + 百分比
 * - compressing：转圈动画
 * - completed/error：状态图标
 */
const MediaPreviewItem: React.FC<{
  item: MediaItem
  onRemove: () => void
}> = observer(({ item, onRemove }) => {
  const isImage = item.mediaType === 'image'
  const isLoading = item.status === 'uploading' || item.status === 'compressing'

  return (
    <div className="group relative">
      {/* 内容 */}
      {isImage ? (
        <div className="relative h-16 w-16 overflow-hidden rounded-lg border">
          <img
            src={item.objectUrl}
            alt={item.name}
            className="h-full w-full object-cover"
          />
          {/* 加载遮罩 */}
          {isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 text-white">
              <Loader2 className="mb-0.5 h-4 w-4 animate-spin" />
              {item.status === 'uploading' && (
                <span className="text-[10px]">{item.uploadProgress}%</span>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className={cn(
          'flex h-16 items-center gap-2 rounded-lg border px-3',
          isLoading && 'bg-muted/30',
        )}>
          {isLoading ? (
            <div className="flex flex-col items-center">
              <Loader2 className="mb-0.5 h-4 w-4 animate-spin text-muted-foreground" />
              {item.status === 'uploading' && (
                <span className="text-[10px] text-muted-foreground">{item.uploadProgress}%</span>
              )}
            </div>
          ) : item.status === 'completed' ? (
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          ) : item.status === 'error' ? (
            <AlertCircle className="h-4 w-4 text-destructive" />
          ) : (
            <FileText className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="max-w-[120px] truncate text-xs text-muted-foreground">
            {item.name}
          </span>
        </div>
      )}

      {/* 删除按钮（hover 显示） */}
      <button
        type="button"
        onClick={onRemove}
        className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] text-white opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <X className="h-2.5 w-2.5" />
      </button>

      {/* 错误提示 */}
      {item.status === 'error' && item.errorMessage && (
        <div className="mt-0.5 text-[10px] text-destructive truncate w-16">
          {item.errorMessage}
        </div>
      )}
    </div>
  )
})

MediaPreviewItem.displayName = 'MediaPreviewItem'

/**
 * MediaPreviewList —        MediaFileList / DialogueFileBar。
 *
 * 输入框上方展示附件缩略图列表。
 */
export interface MediaPreviewListProps {
  items: MediaItem[]
  onRemove: (id: string) => void
  className?: string
}

const MediaPreviewList: React.FC<MediaPreviewListProps> = observer(({
  items,
  onRemove,
  className,
}) => {
  if (items.length === 0) return null

  return (
    <div className={cn('mb-2 flex flex-wrap gap-2', className)}>
      {items.map(item => (
        <MediaPreviewItem
          key={item.id}
          item={item}
          onRemove={() => onRemove(item.id)}
        />
      ))}
    </div>
  )
})

export default MediaPreviewList
