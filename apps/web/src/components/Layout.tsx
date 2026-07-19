import { forwardRef } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { LogOut, Plus } from 'lucide-react'
import { cn } from '@yes/shared'
import { globalStore, authStore, conversationStore } from '@/controller/instances'
import { observer } from 'mobx-react-lite'
import { Sidebar, SidebarToggleIcon } from '@yes/ui'
import ConversationList from '@/pages/Chat/components/ConversationList'

/** 细粒度 className 定制 */
interface LayoutClassNames {
  root?: string
}

export interface LayoutProps {
  className?: string
  classNames?: LayoutClassNames
}

/**
 * 主布局 — 侧边栏 + 主内容区。
 *
 * 侧边栏：折叠/展开、PC 固定 / 移动端覆盖层。
 * 主内容区：移动端带顶栏汉堡按钮。
 */
const Layout = forwardRef<HTMLDivElement, LayoutProps>(
  ({ className, classNames }, ref) => {
    const navigate = useNavigate()
    const { sidebarCollapsed, toggleSidebar, closeSidebar, isMobile } = globalStore
    // 模仿 mimo-chat：有消息 → 显示 header 下边框，空 → 透明无缝
    const hasMessages = conversationStore.messages.length > 0

    /** 退出登录 */
    const handleLogout = () => {
      authStore.logout()
      navigate('/login')
    }

    return (
      <div
        ref={ref}
        className={cn(
          'flex h-screen overflow-hidden bg-background',
          classNames?.root,
          className,
        )}
      >
        {/* 侧边栏：仅在展开时渲染（PC 折叠 / 移动端关闭时不渲染） */}
        {!sidebarCollapsed && (
          <Sidebar
            open={!sidebarCollapsed}
            collapsed={!isMobile && sidebarCollapsed}
            isMobile={isMobile}
            onToggle={toggleSidebar}
            onClose={closeSidebar}
            navChildren={<ConversationList />}
            footer={
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
                title="退出登录"
              >
                <LogOut className="h-4 w-4 shrink-0" />
                <span>退出登录</span>
              </button>
            }
          />
        )}

        {/* 主内容区 */}
        <main className="flex flex-1 flex-col overflow-hidden">
          {/* Header */}
          <div className={cn(
            'flex h-12 shrink-0 items-center justify-between px-3 transition-colors',
            hasMessages && 'border-b',
          )}>
            {/* 左侧：收展 + 新建对话 */}
            <div className="flex items-center gap-1">
              {sidebarCollapsed && (
                <button
                  onClick={toggleSidebar}
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                  title="展开侧栏"
                >
                  <SidebarToggleIcon className="h-[1.125rem] w-[1.125rem]" />
                </button>
              )}
              <button
                onClick={() => conversationStore.newConversation()}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                title="新建对话"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>
            {/* 右侧占位（保持 justify-between） */}
            <div />
          </div>
          <div className="flex-1 overflow-y-auto">
            <Outlet />
          </div>
        </main>
      </div>
    )
  },
)

Layout.displayName = 'Layout'
export default observer(Layout)
