import { forwardRef, useCallback, type ReactNode } from 'react'
import { cn } from '@yes/shared'
import SidebarHeader from './SidebarHeader'
import SidebarNav from './SidebarNav'

interface SidebarClassNames {
  root?: string
  overlay?: string
}

export interface SidebarProps {
  /** 侧栏是否打开 */
  open?: boolean
  /** 侧栏折叠（仅 PC，仅图标） */
  collapsed?: boolean
  /** 是否移动端 */
  isMobile?: boolean
  /** PC 端折叠/展开切换回调 */
  onToggle?: () => void
  /** 关闭侧栏回调 */
  onClose?: () => void
  /** 导航点击回调 */
  onNavClick?: () => void
  /** 侧栏底部插槽（PC 端显示） */
  footer?: ReactNode
  /** 侧栏内容区插槽（Header + Nav 下方，Scroll 区） */
  children?: ReactNode
  className?: string
  classNames?: SidebarClassNames
}

/**
 * 侧栏组件 — 组装 Header（Logo） + Nav（导航）。
 *
 * PC 端：固定左侧，支持折叠/展开。
 * 移动端：全屏覆盖层（遮罩 + 左侧滑入面板）。
 */
const Sidebar = forwardRef<HTMLElement, SidebarProps>(
  (
    { open = true, collapsed = false, isMobile = false, onToggle, onClose, onNavClick, footer, children, className, classNames },
    ref,
  ) => {
    /** 侧栏内容展开模式（移动端始终展开，PC 端跟折叠状态走） */
    const expanded = isMobile || !collapsed

    /** 点击导航链接后回调 */
    const handleNavClick = useCallback(() => {
      onNavClick?.()
      if (isMobile) onClose?.()
    }, [isMobile, onNavClick, onClose])

    /** 渲染侧栏内部内容 */
    const inner = (
      <>
        <SidebarHeader
          expanded={expanded}
          onToggle={!isMobile ? onToggle : undefined}
          onClose={isMobile ? onClose : undefined}
        />
        <SidebarNav
          collapsed={!expanded}
          onNavClick={handleNavClick}
        />
        {/* 内容插槽（如会话列表） */}
        {!isMobile && expanded && children && (
          <div className="flex-1 overflow-y-auto border-t px-2 py-2">
            {children}
          </div>
        )}
        {/* 底部插槽（仅 PC 展开时显示） */}
        {!isMobile && footer && (
          <div className="border-t p-2">
            {footer}
          </div>
        )}
      </>
    )

    // 移动端：覆盖层模式
    if (isMobile) {
      return (
        open && (
          <>
            {/* 半透明遮罩 */}
            <div
              className={cn(
                'fixed inset-0 z-40 bg-black/50 transition-opacity duration-300',
                classNames?.overlay,
              )}
              onClick={onClose}
            />
            {/* 侧滑面板 */}
            <aside
              ref={ref}
              className={cn(
                'fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-background shadow-xl',
                'animate-in slide-in-from-left duration-300',
                classNames?.root,
                className,
              )}
            >
              {inner}
            </aside>
          </>
        )
      )
    }

    // PC 端：固定侧栏
    return (
      <aside
        ref={ref}
        className={cn(
          'flex shrink-0 flex-col border-r bg-muted/30 transition-all duration-200',
          collapsed ? 'w-16' : 'w-56',
          classNames?.root,
          className,
        )}
      >
        {inner}
      </aside>
    )
  },
)

Sidebar.displayName = 'Sidebar'
export default Sidebar
