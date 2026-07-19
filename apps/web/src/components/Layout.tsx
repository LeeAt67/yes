import { forwardRef } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { Menu, LogOut } from 'lucide-react'
import { cn } from '@yes/shared'
import { globalStore, authStore } from '@/controller/instances'
import { observer } from 'mobx-react-lite'
import { Sidebar } from '@yes/ui'
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
        {/* 侧边栏 */}
        <Sidebar
          open={!sidebarCollapsed}
          collapsed={sidebarCollapsed}
          isMobile={isMobile}
          onToggle={toggleSidebar}
          onClose={closeSidebar}
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

        {/* 会话列表面板 */}
        {!isMobile && !sidebarCollapsed && (
          <aside className="flex w-56 shrink-0 flex-col border-r bg-card">
            <div className="flex-1 overflow-y-auto p-2">
              <ConversationList />
            </div>
          </aside>
        )}

        {/* 主内容区 */}
        <main className="flex flex-1 flex-col overflow-hidden">
          {/* 移动端顶栏：汉堡菜单按钮 */}
          {isMobile && (
            <div className="flex h-12 shrink-0 items-center border-b px-3">
              <button
                onClick={toggleSidebar}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                title="打开菜单"
              >
                <Menu className="h-5 w-5" />
              </button>
              <span className="ml-3 font-semibold text-sm">YES</span>
            </div>
          )}
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
