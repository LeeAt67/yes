import { forwardRef } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { Home, MessageSquare, Puzzle, Sun, Moon, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createLogger } from '@/utils/logger'
import { globalStore } from '@/controller/instances'
import { observer } from 'mobx-react-lite'

const logger = createLogger('components:layout')

const navLinks = [
  { to: '/', label: 'Chat', icon: Home },
  { to: '/claw', label: 'Claw', icon: MessageSquare },
  { to: '/components', label: '预览', icon: Puzzle },
]

/** 细粒度 className 定制 */
interface LayoutClassNames {
  root?: string
  sidebar?: string
  nav?: string
}

export interface LayoutProps {
  className?: string
  classNames?: LayoutClassNames
}

/**
 * 主布局 — Claude 风格左侧栏。
 * 包含：Logo、导航菜单、暗色模式切换、内容区。
 */
const Layout = forwardRef<HTMLDivElement, LayoutProps>(
  ({ className, classNames }, ref) => {
    const location = useLocation()

    const { darkMode, toggleDarkMode, sidebarCollapsed, toggleSidebar } = globalStore

    const handleToggleDark = () => {
      toggleDarkMode()
      logger.debug('Dark mode toggled:', !darkMode)
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
        <aside
          className={cn(
            'flex shrink-0 flex-col border-r bg-muted/30 transition-all duration-200',
            sidebarCollapsed ? 'w-14' : 'w-56',
            classNames?.sidebar,
          )}
        >
          {/* Logo */}
          <div className="flex h-14 items-center gap-3 border-b px-3">
            <Link
              to="/"
              className="flex shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground h-7 w-7 text-xs font-bold"
            >
              R
            </Link>
            {!sidebarCollapsed && (
              <Link to="/" className="font-semibold text-sm">
                YES
              </Link>
            )}
            <button
              onClick={toggleSidebar}
              className={cn(
                'shrink-0 rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors',
                sidebarCollapsed ? 'mx-auto' : 'ml-auto',
              )}
              title={sidebarCollapsed ? '展开侧栏' : '收起侧栏'}
            >
              {sidebarCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </button>
          </div>

          {/* 导航 */}
          <nav className={cn('flex-1 overflow-y-auto p-2 space-y-0.5', classNames?.nav)}>
            {navLinks.map(({ to, label, icon: Icon }) => {
              const isActive = location.pathname === to
              return (
                <Link
                  key={to}
                  to={to}
                  title={sidebarCollapsed ? label : undefined}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                    isActive
                      ? 'bg-accent text-foreground font-medium'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent/50',
                    sidebarCollapsed && 'justify-center px-0',
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {!sidebarCollapsed && <span>{label}</span>}
                </Link>
              )
            })}
          </nav>

          {/* 主题切换 */}
          <div className="border-t p-2">
            <button
              onClick={handleToggleDark}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors',
                sidebarCollapsed && 'justify-center px-0',
              )}
              title={darkMode ? '切换亮色' : '切换暗色'}
            >
              {darkMode ? <Sun className="h-4 w-4 shrink-0" /> : <Moon className="h-4 w-4 shrink-0" />}
              {!sidebarCollapsed && <span>{darkMode ? '亮色模式' : '暗色模式'}</span>}
            </button>
          </div>
        </aside>

        {/* 内容区 */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    )
  },
)

Layout.displayName = 'Layout'
export default observer(Layout)
