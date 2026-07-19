import { forwardRef, useCallback, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Home, MessageSquare, Puzzle } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@yes/shared'

/** 导航项配置 */
export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
}

interface SidebarNavClassNames {
  root?: string
  link?: string
}

export interface SidebarNavProps {
  items?: NavItem[]
  /** 折叠模式（仅显示图标） */
  collapsed?: boolean
  /** 点击链接后回调（移动端关闭菜单等） */
  onNavClick?: () => void
  /** 子插槽（如会话列表），放在导航项下方 */
  children?: React.ReactNode
  className?: string
  classNames?: SidebarNavClassNames
}

/** 默认导航项 */
const defaultItems: NavItem[] = [
  { to: '/', label: 'Chat', icon: Home },
  { to: '/claw', label: 'Claw', icon: MessageSquare },
  { to: '/components', label: '预览', icon: Puzzle },
]

/**
 * 侧栏导航组件。
 *
 * 渲染导航链接列表，支持折叠模式（仅图标）和展开模式（图标 + 文字）。
 * 自动根据当前路由高亮激活项。
 */
const SidebarNav = forwardRef<HTMLElement, SidebarNavProps>(
  ({ items = defaultItems, collapsed = false, onNavClick, children, className, classNames }, ref) => {
    const location = useLocation()

    /** 点击链接后触发回调 */
    const handleClick = useCallback(() => {
      onNavClick?.()
    }, [onNavClick])

    return (
      <nav ref={ref} className={cn('flex-1 overflow-y-auto p-2 space-y-0.5', classNames?.root, className)}>
        {items.map(({ to, label, icon: Icon }) => {
          const isActive = location.pathname === to
          return (
            <Link
              key={to}
              to={to}
              onClick={handleClick}
              title={collapsed ? label : undefined}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                isActive
                  ? 'bg-accent text-foreground font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/50',
                collapsed && 'justify-center px-0',
                classNames?.link,
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{label}</span>}
            </Link>
          )
        })}
        {!collapsed && children && (
          <div className="mt-1">{children}</div>
        )}
      </nav>
    )
  },
)

SidebarNav.displayName = 'SidebarNav'
export default SidebarNav
