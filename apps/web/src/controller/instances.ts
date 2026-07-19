/**
 * Store 单例统一管理。
 *
 * 依赖链：localStorageStore → globalStore → voiceStore / conversationStore / shareStore
 * 所有页面和组件应从这里导入实例，禁止自行 new Store()。
 *
 */

import GlobalStore from './stores/global'
import ConversationStore from './stores/conversation'
import ClawStore from './stores/claw'
import ShareStore from './stores/share'
import StorageStore from './stores/storage'
import VoiceStore from './stores/voice'
import AuthStore from './stores/auth'
import ToolStore from './stores/tool'
import MediaStore from './stores/media'

/** 本地存储管理实例 */
export const localStorageStore = new StorageStore()

/** 全局状态管理实例 */
export const globalStore = new GlobalStore()

/** 鉴权状态管理实例 */
export const authStore = new AuthStore()

/** 对话消息管理实例 */
export const conversationStore = new ConversationStore()

/** 工具调用状态管理实例 */
export const toolStore = new ToolStore()

/** 媒体上传状态管理实例（       MediaUploader） */
export const mediaStore = new MediaStore()

/** Claw 独立状态管理实例 */
export const clawStore = new ClawStore()

/** 分享状态管理实例 */
export const shareStore = new ShareStore()

/** 语音状态管理实例 */
export const voiceStore = new VoiceStore()
