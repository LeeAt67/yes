# CLAUDE.md — React 19 Scaffold 项目指引

## 项目概述

React 19 + MobX 6 + Tailwind CSS 3 + shadcn/ui 前端脚手架，构建工具为 Rspack 2 + SWC，集成 React Router v7 + HashRouter 路由。

## 常用命令

```bash
npm start          # 启动开发服务器 (http://localhost:8000)
npm run build      # 生产构建
npm run preview    # 预览生产构建
```

---

## 架构概览

| 层级 | 路径 | 说明 |
|------|------|------|
| 状态管理 | `src/controller/stores/`（global、conversation、claw、share、storage、voice） | MobX + makeAutoObservable |
| 副作用 | `src/controller/effects/` | 应用初始化等副作用 |
| 服务层 | `src/service/`（Zod 校验） | API 客户端 |
| 组件库 | `src/components/kui/`（atoms / molecules / organisms） | KUI 原子化组件 |
| 通用组件 | `src/components/` | Layout 等 |
| 页面 | `src/pages/` | HomePage、AboutPage、ChatInputDemo |
| 路由 | `src/route/index.tsx` | HashRouter + useRoutes() |
| 工具 | `src/utils/` | logger |
| 国际化 | `src/lang/` | zh-CN、en-US |

### 路由结构

```
/          → HomePage    （Claude 风格问候 + ChatInput）
/about     → AboutPage   （技术栈卡片）
/kui       → ChatInputDemo（组件库演示）
```

---

## 组件规范

公共组件必须满足 forwardRef + classNames + cn 模式：
### SVG 图标

使用 `lucide-react` 图标库：

```tsx
import { Home } from 'lucide-react'
;<Home className="h-4 w-4" />
```

颜色用 `text-*` Tailwind class 控制。

### MobX 集成

- 响应式组件用 `observer` 包裹（`mobx-react-lite`）
- Store 构造函数调用 `makeAutoObservable(this)`
- 方法统一用**箭头函数**

---

## 代码规范

- 注释用**中文**，方法写 **TSDoc**
- 方法**必须用箭头函数**
- 日志用 `createLogger`，禁止直接用 `console`

```typescript
import { createLogger } from '@/utils/logger'
const logger = createLogger('模块:子模块')
logger.warn('Failed:', error)
```

## KUI 组件库

```
src/components/kui/
├── atoms/           # Button, IconButton
├── molecules/       # PromptTextarea, SendButton, VoiceButton, AttachButton, ModelSelector
├── organisms/       # InputToolbar
├── ChatInput.tsx    # 完整组件
└── index.ts         # 统一导出
```

Design Tokens: `src/lib/tokens.ts`、`src/index.css`（极简黑白体系）

---

## 分支工作流 (.claude/skills/branch-workflow)

- 开发新功能必须建分支：`git checkout -b feat/xxx`
- 合并 main 前需用户许可
- 严禁直接 push main

---

## 注意事项

1. 项目 ESM 模式，不能用 `require`
2. `@rspack/plugin-react-refresh` 只有具名导出
3. `cn()` = clsx + twMerge，统一合并 className
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
