import { forwardRef } from 'react'
import { Plus, Trash2, MessageSquare } from 'lucide-react'
import { cn } from '@yes/shared'
import { observer } from 'mobx-react-lite'
import { conversationStore } from '@/controller/instances'

export interface ConversationListProps {
  className?: string
}

/**
 * 会话列表 — 显示在侧边栏，支持创建/切换/删除。
 *
 * 参考 ChatGPT 侧边栏：顶部"新建对话"按钮 + 可滚动的会话列表。
 */
const ConversationList = forwardRef<HTMLDivElement, ConversationListProps>(
  ({ className }, ref) => {
    const { list, activeId } = conversationStore

    return (
      <div ref={ref} className={cn('flex flex-col gap-1', className)}>
        {/* 新建对话 */}
        <button
          onClick={() => conversationStore.newConversation()}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
        >
          <Plus className="h-4 w-4 shrink-0" />
          <span>新建对话</span>
        </button>

        {/* 列表 */}
        <div className="mt-1 flex-1 overflow-y-auto space-y-0.5">
          {list.map(conv => (
            <div key={conv.id} className="group relative">
              <button
                onClick={() => conversationStore.switchConversation(conv.id)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors text-left',
                  conv.id === activeId
                    ? 'bg-accent text-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/50',
                )}
              >
                <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate flex-1">{conv.title || '新对话'}</span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  conversationStore.removeConversation(conv.id)
                }}
                className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive hover:bg-destructive/10 transition-opacity"
                title="删除对话"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      </div>
    )
  },
)

ConversationList.displayName = 'ConversationList'
export default observer(ConversationList)
