import { makeAutoObservable } from 'mobx'

/**
 * Claw 主对话页 Store。
 */
class ClawStore {
  /** 输入框文字 */
  inputValue = ''

  /** 是否正在请求 */
  loading = false

  constructor() {
    makeAutoObservable(this)
  }

  setInputValue = (value: string) => {
    this.inputValue = value
  }

  setLoading = (loading: boolean) => {
    this.loading = loading
  }

  reset = () => {
    this.inputValue = ''
    this.loading = false
  }
}

export default ClawStore
