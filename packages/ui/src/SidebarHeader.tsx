import { forwardRef } from 'react'
import { Link } from 'react-router-dom'
import { X } from 'lucide-react'
import { cn } from '@yes/shared'
import SidebarToggleIcon from './assets/sidebar-toggle.svg'

interface SidebarHeaderClassNames {
  root?: string
  logo?: string
  title?: string
  toggleBtn?: string
  closeBtn?: string
}

export interface SidebarHeaderProps {
  /** Logo 缩写字符 */
  logoText?: string
  /** 标题文字 */
  title?: string
  /** 展开模式（显示标题 + 操作按钮） */
  expanded?: boolean
  /** PC 端展开/收起切换回调 */
  onToggle?: () => void
  /** 关闭按钮点击回调（移动端） */
  onClose?: () => void
  className?: string
  classNames?: SidebarHeaderClassNames
}

/**
 * 侧栏头部组件。
 *
 * PC 展开：Logo + 标题（左） ｜ 折叠切换图标（右）
 * PC 折叠：仅居中显示折叠切换图标
 * 移动端：Logo + 标题（左） ｜ ✕ 关闭按钮（右）
 */
const SidebarHeader = forwardRef<HTMLDivElement, SidebarHeaderProps>(
  (
    { logoText = 'R', title = 'YES', expanded = false, onToggle, onClose, className, classNames },
    ref,
  ) => {
    // PC 折叠状态：仅显示切换图标居中
    if (!expanded && onToggle) {
      return (
        <div
          ref={ref}
          className={cn(
            'flex h-14 items-center justify-center',
            classNames?.root,
            className,
          )}
        >
          <button
            onClick={onToggle}
            className={cn(
              'rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors',
              classNames?.toggleBtn,
            )}
            title="展开侧栏"
          >
            <SidebarToggleIcon className="h-[1.125rem] w-[1.125rem]" />
          </button>
        </div>
      )
    }

    // 展开状态（PC / 移动端）
    return (
      <div
        ref={ref}
        className={cn(
          'flex h-14 items-center justify-between px-4',
          classNames?.root,
          className,
        )}
      >
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className={cn(
              'flex shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground h-7 w-7 text-xs font-bold',
              classNames?.logo,
            )}
          >
            {logoText}
          </Link>
          <Link to="/" className={cn('font-semibold text-sm', classNames?.title)}>
            {title}
          </Link>
        </div>
        {/* PC 端：折叠切换图标 */}
        {onToggle && (
          <button
            onClick={onToggle}
            className={cn(
              '-mr-1 rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors',
              classNames?.toggleBtn,
            )}
            title="收起侧栏"
          >
            <SidebarToggleIcon className="h-[1.125rem] w-[1.125rem]" />
          </button>
        )}
        {/* 移动端：关闭按钮 */}
        {onClose && (
          <button
            onClick={onClose}
            className={cn(
              '-mr-1 rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors',
              classNames?.closeBtn,
            )}
            title="关闭菜单"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    )
  },
)

SidebarHeader.displayName = 'SidebarHeader'
export default SidebarHeader
