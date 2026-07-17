import { createContext, useContext } from 'react'
import CounterStore from './CounterStore'
import TodoStore from './TodoStore'

class RootStore {
  counter = new CounterStore()
  todo = new TodoStore()
}

const rootStore = new RootStore()
const StoreContext = createContext(rootStore)

export function useStore() {
  return useContext(StoreContext)
}

export { RootStore, CounterStore, TodoStore, StoreContext, rootStore }
export default rootStore
