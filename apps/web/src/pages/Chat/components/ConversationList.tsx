import { forwardRef } from 'react'
import { Trash2, MessageSquare } from 'lucide-react'
import { cn } from '@yes/shared'
import { observer } from 'mobx-react-lite'
import { conversationStore } from '@/controller/instances'

export interface ConversationListProps {
  className?: string
}

/**
 * 会话列表 — 显示在侧边栏导航下方，支持切换/删除。
 *
 *       SidebarNavSection：头部标题 + 右侧 + 按钮。
 */
const ConversationList = forwardRef<HTMLDivElement, ConversationListProps>(
  ({ className }, ref) => {
    const { list, activeId } = conversationStore

    return (
      <div ref={ref} className={cn('space-y-0.5', className)}>
        {/* 列表 */}
        {list.map(conv => (
          <div key={conv.id} className="group relative">
            <button
              onClick={() => conversationStore.switchConversation(conv.id)}
              className={cn(
                'flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-xs transition-colors text-left',
                conv.id === activeId
                  ? 'bg-accent text-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/50',
              )}
            >
              <MessageSquare className="h-3 w-3 shrink-0" />
              <span className="truncate flex-1">{conv.title || '新对话'}</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                conversationStore.removeConversation(conv.id)
              }}
              className="absolute right-1 top-1/2 -translate-y-1/2 p-0.5 rounded text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive hover:bg-destructive/10 transition-opacity"
              title="删除对话"
            >
              <Trash2 className="h-2.5 w-2.5" />
            </button>
          </div>
        ))}
      </div>
    )
  },
)

ConversationList.displayName = 'ConversationList'
export default observer(ConversationList)
