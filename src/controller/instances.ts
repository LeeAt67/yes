/**
 * Store 单例统一管理。
 *
 * 依赖链：localStorageStore → globalStore → voiceStore / conversationStore / shareStore
 * 所有页面和组件应从这里导入实例，禁止自行 new Store()。
 *
 * 参考 MiMo Chat 架构。
 */

import GlobalStore from './stores/global'
import ConversationStore from './stores/conversation'
import ClawStore from './stores/claw'
import ShareStore from './stores/share'
import StorageStore from './stores/storage'
import VoiceStore from './stores/voice'

/** 本地存储管理实例 */
export const localStorageStore = new StorageStore()

/** 全局状态管理实例 */
export const globalStore = new GlobalStore()

/** 对话消息管理实例 */
export const conversationStore = new ConversationStore()

/** Claw 独立状态管理实例 */
export const clawStore = new ClawStore()

/** 分享状态管理实例 */
export const shareStore = new ShareStore()

/** 语音状态管理实例 */
export const voiceStore = new VoiceStore()
