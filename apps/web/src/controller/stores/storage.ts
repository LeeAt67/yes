import { makeAutoObservable } from 'mobx'

/**
 * 本地存储 Store（骨架）。
 */
class StorageStore {
  quota = 0
  usage = 0

  constructor() {
    makeAutoObservable(this)
  }
}

export default StorageStore
