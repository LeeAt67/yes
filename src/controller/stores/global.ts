import { makeAutoObservable } from 'mobx'

/**
 * 应用全局状态 Store。
 */
class GlobalStore {
  /** 侧栏折叠 */
  sidebarCollapsed = false

  /** 暗色模式 */
  darkMode = false

  constructor() {
    makeAutoObservable(this)
    this.darkMode = document.documentElement.classList.contains('dark')
  }

  toggleSidebar = () => {
    this.sidebarCollapsed = !this.sidebarCollapsed
  }

  toggleDarkMode = () => {
    this.darkMode = !this.darkMode
    document.documentElement.classList.toggle('dark', this.darkMode)
  }
}

export default GlobalStore
