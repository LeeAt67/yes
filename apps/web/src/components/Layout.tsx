import { forwardRef } from 'react'
import { Outlet } from 'react-router-dom'
import { Menu } from 'lucide-react'
import { cn } from '@yes/shared'
import { globalStore } from '@/controller/instances'
import { observer } from 'mobx-react-lite'
import { Sidebar } from '@yes/ui'

/** 细粒�?className 定制 */
interface LayoutClassNames {
  root?: string
}

export interface LayoutProps {
  className?: string
  classNames?: LayoutClassNames
}

/**
 * 主布局 �?侧边�?+ 主内容区�?
 *
 * 侧边栏：折叠/展开、PC 固定 / 移动端覆盖层�?
 * 主内容区：移动端带顶栏汉堡按钮�?
 */
const Layout = forwardRef<HTMLDivElement, LayoutProps>(
  ({ className, classNames }, ref) => {
    const { sidebarCollapsed, toggleSidebar, closeSidebar, isMobile } = globalStore

    return (
      <div
        ref={ref}
        className={cn(
          'flex h-screen overflow-hidden bg-background',
          classNames?.root,
          className,
        )}
      >
        {/* 侧边�?*/}
        <Sidebar
          open={!sidebarCollapsed}
          collapsed={sidebarCollapsed}
          isMobile={isMobile}
          onToggle={toggleSidebar}
          onClose={closeSidebar}
        />

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
