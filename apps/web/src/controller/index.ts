/**
 * Controller 层统一导出 — stores + effects + instances。
 */
export { default as GlobalStore } from './stores/global'
export { default as ConversationStore } from './stores/conversation'
export { default as ClawStore } from './stores/claw'
export { default as ShareStore } from './stores/share'
export { default as StorageStore } from './stores/storage'
export { default as VoiceStore } from './stores/voice'

export {
  localStorageStore,
  globalStore,
  conversationStore,
  clawStore,
  shareStore,
  voiceStore,
} from './instances'
