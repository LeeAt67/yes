import { makeAutoObservable } from 'mobx'
import { createLogger } from '@yes/shared'

const logger = createLogger('stores:global')

/** 移动端断点（px�?*/
const MOBILE_BREAKPOINT_PX = 768

/**
 * 应用全局状�?Store�?
 */
class GlobalStore {
  /** 侧栏折叠（PC 端最小化/展开，移动端为打开/关闭覆盖层） */
  sidebarCollapsed = false

  /** 暗色模式 */
  darkMode = false

  /** 当前是否为移动端 */
  isMobile = false

  constructor() {
    makeAutoObservable(this)
    this.darkMode = document.documentElement.classList.contains('dark')
    this.isMobile = this.checkIsMobile()
    window.addEventListener('resize', this.handleResize)
  }

  /** 检测当前视口是否为移动�?*/
  private checkIsMobile = (): boolean => {
    return window.innerWidth < MOBILE_BREAKPOINT_PX
  }

  /** resize 事件处理 �?仅在跨越断点时更�?*/
  private handleResize = () => {
    const mobile = this.checkIsMobile()
    if (mobile !== this.isMobile) {
      this.isMobile = mobile
      logger.debug('Device mode changed:', mobile ? 'mobile' : 'desktop')
      // 切换到移动端时自动关闭侧栏覆盖层
      if (mobile && !this.sidebarCollapsed) {
        this.sidebarCollapsed = true
      }
    }
  }

  /** 切换侧栏 */
  toggleSidebar = () => {
    this.sidebarCollapsed = !this.sidebarCollapsed
  }

  /** 关闭侧栏 */
  closeSidebar = () => {
    this.sidebarCollapsed = true
  }

  /** 打开侧栏 */
  openSidebar = () => {
    this.sidebarCollapsed = false
  }

  /** 切换暗色模式 */
  toggleDarkMode = () => {
    this.darkMode = !this.darkMode
    document.documentElement.classList.toggle('dark', this.darkMode)
  }
}

export default GlobalStore
