import { makeAutoObservable } from 'mobx'

/**
 * 分享 Store（骨架）。
 */
class ShareStore {
  enabled = false

  constructor() {
    makeAutoObservable(this)
  }
}

export default ShareStore
