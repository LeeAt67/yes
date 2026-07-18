# stores (状态管理)

> 📂 路径：`apps/web/src/controller/stores/`
> 🏷️ 类型：**State** (MobX 状态层)

---

## 概览

基于 MobX 的响应式状态管理，所有 Store 通过 `src/controller/instances.ts` 统一实例化（依赖注入链）。

## 依赖链

```
StorageStore (无依赖)
  → GlobalStore
    → VoiceStore / ConversationStore / ShareStore / ClawStore
```

**关键约束**：禁止在组件中 `new Store()`，必须从 `@/controller/instances` 导入单例。

## Store 职责速览

| Store | 职责 | 核心状态 |
|------|------|---------|
| `global.ts` | 侧栏、暗色模式、移动端检测 | `sidebarCollapsed`, `darkMode`, `isMobile` |
| `conversation.ts` | 对话消息列表 | 对话/消息 CRUD |
| `claw.ts` | Claw 页面独立状态 | Claw 会话 |
| `voice.ts` | 语音录制/播放 | 录音状态 |
| `storage.ts` | 本地持久化 | localStorage 读写 |
| `share.ts` | 分享功能 | 分享链接 |

## `GlobalStore` 深入

### isMobile 的响应式检测

```typescript
// 构造函数中初始化 + 监听 resize
this.isMobile = window.innerWidth < 768
window.addEventListener('resize', this.handleResize)

// 跨越断点时的副作用编排
private handleResize = () => {
  const mobile = this.checkIsMobile()
  if (mobile !== this.isMobile) {
    this.isMobile = mobile
    if (mobile && !this.sidebarCollapsed) {
      this.sidebarCollapsed = true  // 切换到移动端自动关闭侧栏
    }
  }
}
```

**为什么不用 CSS `@media`？** 因为 `isMobile` 变化需要触发**行为副作用**（关闭侧栏），而不仅仅是换样式。CSS 媒体查询只能改同一个 DOM 的样式，无法增加/移除节点（如移动端需要的遮罩层、关闭按钮）。

### 为什么面板宽度不存这里？

MobX 的 observable 变化会广播到所有订阅者。拖拽 resize 每秒触发 60 次 `mousemove`，如果存入 GlobalStore 会导致 60fps 的全树重渲染。实际做法：宽度用组件内 `useState`，高频变更局部化。

## 导入规范

```typescript
// ✅ 从 instances 导入单例
import { globalStore, conversationStore } from '@/controller/instances'

// ❌ 禁止自行实例化
import GlobalStore from './stores/global'
const store = new GlobalStore()
```
