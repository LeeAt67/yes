# YES — Claude Code 项目指引

## 读代码前先看 AGENTS.md

处理任何模块文件夹（组件、hook、工具函数、服务、store）时，**先检查是否存在 AGENTS.md**，再读源文件。

优先级：AGENTS.md → 源文件。

AGENTS.md 位置规律：
```
src/components/ComponentName/AGENTS.md
src/hooks/useHookName/AGENTS.md
src/utils/utilName/AGENTS.md
src/service/serviceName/AGENTS.md
src/controller/stores/storeName/AGENTS.md
```

**修改模块逻辑后，若该模块存在 AGENTS.md，必须同步更新文档。**

---

## Figma 设计稿

收到任何 Figma 链接时，先读 `.agents/skills/figma-to-code/SKILL.md`，再生成代码。

- 严禁使用 px，只能用 rem
- Figma MCP 返回的原始色值不可直接用于代码，必须映射为项目 Design Token

---

## 架构概览

Demo 是 React + TypeScript + MobX + Tailwind CSS 的通用应用，拥有多项功能。

| 层级 | 路径 |
|------|------|
| 状态管理 | `src/controller/stores/`（global、conversation、claw、share、storage、voice） |
| 副作用 | `src/controller/effects/` |
| 服务层 | `src/service/`（用 Zod 做运行时类型校验） |
| 组件 | `src/components/` |
| 页面 | `src/pages/`（`/` → Home，`/claw` → Claw，`/components` → 组件预览） |
| 路由 | `src/route/index.tsx`，HashRouter |

### 关键文件

- `src/App.tsx` — 根组件
- `src/controller/instances.ts` — Store 单例管理（依赖注入链）
- `src/route/index.tsx` — 路由定义与导航守卫
- `src/components/Chat/` — 核心聊天 UI
- `src/pages/Home/` — 首页（`/`）
- `src/pages/Claw/` — Claw 对话页（`/claw`）
- `src/service/chat/` — 流式聊天 API 客户端
- `src/pages/Home/` — Chat 文本聊天页（`/c`）
- `src/service/chat/` — 流式聊天 API 客户端

---

## 组件规范

### 目录结构

每个组件一个独立文件夹，入口始终为 `index.tsx`：

```
ComponentName/
├── index.tsx
├── style.module.less
├── components/        # 仅本组件使用的子组件
├── hooks/             # 组件专属 Hook（可选）
├── utils/             # 组件专属工具函数（可选）
└── assets/            # 组件专属资源（可选）
```

全局可复用组件 → `src/components/`；页面专属组件 → `src/pages/PageName/components/`。

### 公共组件必须满足

```tsx
import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface MyComponentClassNames {
  root?: string
  title?: string
}

export interface MyComponentProps {
  title: string
  className?: string
  classNames?: MyComponentClassNames
}

const MyComponent = forwardRef<HTMLDivElement, MyComponentProps>(
  ({ title, className, classNames }, ref) => (
    <div ref={ref} className={cn('flex items-center', classNames?.root, className)}>
      <span className={cn('text-base font-medium', classNames?.title)}>{title}</span>
    </div>
  ),
)

MyComponent.displayName = 'MyComponent'
export default MyComponent
```

要点：`forwardRef`、`classNames` prop（细粒度定制）、`className` prop（整体覆盖）、始终用 `cn` 合并类名。

### SVG 图标

```tsx
import XxxIcon from '@/assets/svg/xxx.svg'
;<XxxIcon className="text- -icon-n1 h-4 w-4" />
```

SVG 组件只接受 `className`，不接受 `classNames`。颜色用 `text-*` 控制（需 SVG 内部 `fill="currentColor"`）。

### MobX 集成

- 响应式组件用 `observer` 包裹（`mobx-react-lite`）
- Store 构造函数调用 `makeAutoObservable(this)`
- 批量状态修改用 `runInAction()`

---

## 代码规范

### 注释与文档

- 所有注释和文档一律用**中文**
- 所有方法必须写 **TSDoc** 格式文档注释
- 方法统一用**箭头函数**
- 方法内复杂逻辑补充中文行内注释（说明意图，不重复字面意思）

```typescript
/**
 * 发送聊天消息并处理流式响应。
 *
 * @param content - 消息内容
 * @param options - 可选配置项
 * @returns 返回本次消息对应的 AbortController，用于取消请求
 */
export const sendMessage = (content: string, options?: SendOptions): AbortController => {
  const payload = buildPayload(content, options)
  const controller = new AbortController()
  streamChat(payload, controller.signal)
  return controller
}
```

### 日志规范

**禁止直接使用 `console.log/warn/error`**，必须用 `createLogger`：

```typescript
import { createLogger } from '@/utils/logger'
const logger = createLogger('claw:resource')

// 服务端接口失败 → warn
logger.warn('Failed to get chat history:', error)

// 本地程序错误 → error
logger.error('Failed to enable microphone:', error)

// 调试日志 → debug（生产不打印）
logger.debug('retract_message RPC called:', payload)
```

模块命名约定：`大模块:子模块`，如 `claw:resource`、`conversation:message`、`voice:config`。

### 国际化

- 翻译文件：`src/lang/`（en-US、zh-CN），12 个按模块划分的 JSON 文件
- Key 规范：`模块.分类.条目`，如 `t('auth.status.not_logged_in')`
- 变量插值用**单花括号**：`{variable}`（不是双花括号）

```
✅ "Demo only processed the first {ratio}%"
❌ "Demo only processed the first {{ratio}}%"
```

---

## 每次编码完成后必须执行

**按顺序执行，修复所有问题后再结束任务：**

```bash
# 第一步：TypeScript 类型检查
npx tsgo --noEmit

# 第二步：ESLint 检查（针对改动文件）
npx eslint <file-path> --format=compact
npx eslint <file-path> --fix   # 自动修复
```

---

## 开发命令

```bash
npm start           # 开发服务器（热重载）
npm run build       # 生产构建
npm run lint        # ESLint + Stylelint + Prettier
npm run tsc         # TypeScript 类型检查
```


## 组件开发流程

### 公共组件开发（开发完后进 `src/components/`）

工作区：`src/pages/KUI/components/`
预览路由：`#/kui`

开发完时：移至 `src/components/`，更新 import，改 status 为 `'over'`，删除开发目录。

### 页面私有组件开发（永远留在页面内）

工作区：`src/pages/PageName/components/Preview/components/`
预览路由：`#/page-route/components`（如 `#/c/components`）

开发完时：移至 `src/pages/PageName/components/`，更新 import，改 status，删除开发目录。
