---
name: kui-component-builder
description: "Use when user asks to build a new complex component (like ChatInput, FormDialog, DataTable, etc.) or says '搭建组件' / '复刻XX组件'. This skill enforces building from atomic components bottom-up and registering into the KUI library."
argument-hint: 'Describe the complex component to build (e.g. "a Claude-style chat input")'
---

# KUI Component Builder

## Overview

当需要创建复杂组件时，强制执行**原子化搭建**流程：拆解 → 原子 → 分子 → 有机体 → 完整组件 → 注册到 KUI 库 → 创建 Demo 页面。

## Trigger

激活条件（满足任一）：
- 用户说"搭建组件"、"复刻 XX 组件"、"做一个 XX 组件"
- 用户描述了一个**由多个子组件组成**的复杂 UI 组件
- 用户问"如何搭建一个 XX"且 XX 是复杂交互组件

## 项目上下文

- KUI 组件库路径：`src/components/kui/`
- 层级目录：`atoms/` → `molecules/` → `organisms/` → `ChatInput.tsx` (完整组件)
- 导出索引：`src/components/kui/index.ts`
- Demo 页面：`src/pages/Components/components/`（预览区）
- Demo 路由：`#/components`
- 路由注册：`src/route/index.tsx`
- 基础原子 Button 位于 `src/components/kui/atoms/Button.tsx`，提供 6 种 variant + 5 种 size
- IconButton 位于 `src/components/kui/atoms/IconButton.tsx`，封装 Button 为图标按钮
- 项目使用 Tailwind CSS + shadcn/ui + lucide-react 图标

## Procedure

### Step 1: 需求拆解

先不写代码，输出**组件拆解树**：

```
目标组件 (完整组件)
│
├── 子组件A  (有机体) — 职责描述
│   ├── 子子组件A1 (分子)
│   │   └── IconButton (原子)
│   └── 子子组件A2 (分子)
│       └── Button (原子)
│
├── 子组件B  (分子) — 职责描述
│   └── Button (原子)
│
└── 子组件C  (分子) — 职责描述
```

确认后再继续。

### Step 2: 自底向上搭建

按层级从底向上创建文件：

| 层级 | 目录 | 命名 |
|------|------|------|
| 原子 (atom) | `kui/atoms/` | 如 `Switch.tsx` |
| 分子 (molecule) | `kui/molecules/` | 如 `ToggleButton.tsx` |
| 有机体 (organism) | `kui/organisms/` | 如 `FormToolbar.tsx` |
| 完整组件 | `kui/` | 如 `SearchForm.tsx` |

**原子组件规则：**
- 优先复用已有 Button / IconButton，除非确实需要新的基础元素
- 每个原子导出 Props 类型
- 添加 `displayName`：`{Component}.displayName = 'Kui{Component}'`

**分子组件规则：**
- 必定依赖原子组件，组合而非重新实现
- 注释注明依赖链：`// 封装自 IconButton → KuiButton`

**有机体组件规则：**
- 组装多个分子，提供完整的交互区域

### Step 3: 注册到 KUI 库

在 `src/components/kui/index.ts` 中按层级添加导出：

```ts
// ===== 原子组件 =====
export { NewAtom } from './atoms/NewAtom'

// ===== 分子组件 =====
export { NewMolecule } from './molecules/NewMolecule'

// ===== 有机体组件 =====
export { NewOrganism } from './organisms/NewOrganism'

// ===== 完整组件 =====
export { NewComponent } from './NewComponent'
```

### Step 4: 创建 Demo 页面

在 `src/pages/` 创建 `{ComponentName}Demo.tsx`：

**布局规范（Ant Design 风格）：**
```
┌────────────┬──────────────────────────────┐
│ 左侧 56px  │ 右侧内容区                    │
│            │                              │
│ ▸ 通用     │  # ComponentName             │
│   Button   │  描述文字                     │
│   ...      │                              │
│ ▸ 数据录入 │  [完整组件 Demo]              │
│   ...      │                              │
│ ▸ 反馈     │                              │
│   ...      │                              │
│ ▸ 组合     │                              │
│   新组件   │                              │
└────────────┴──────────────────────────────┘
```

要求：
- 左侧：折叠式分类导航（通用 / 数据录入 / 反馈 / 组合）+ 组件描述
- 右侧：标题 + 组件 Demo
- 每个子组件有独立 Demo 区块
- 使用 `useState` 管理 activeKey，点击左侧切换右侧内容

### Step 5: 添加路由

在 `src/routes.tsx` 添加路由，并在 `Layout.tsx` 导航链接中添加入口。

### Step 6: 验证

- 确认 `npm start` 编译无错误
- 确认页面可通过路由访问
- 确认左侧导航分组可点击切换

## Anti-patterns

- ❌ 直接把所有逻辑写在一个大文件里
- ❌ 分子组件直接实现底层逻辑而不复用原子
- ❌ 忘记注册到 `kui/index.ts`
- ❌ Demo 页面不按 AntD 分类导航布局
- ❌ 命名不使用 PascalCase

## 示例：ChatInput 搭建过程

```
Step 1 拆解:
ChatInput
├── PromptTextarea  — 自动撑高输入区
├── InputToolbar    — 底部工具栏
│   ├── AttachButton   → IconButton → KuiButton
│   ├── ModelSelector  — 模型下拉
│   ├── VoiceButton    → IconButton → KuiButton
│   ├── SettingsButton → IconButton → KuiButton
│   └── SendButton     → KuiButton

Step 2 搭建:
atoms:     Button.tsx, IconButton.tsx
molecules: PromptTextarea.tsx, SendButton.tsx, VoiceButton.tsx,
           AttachButton.tsx, ModelSelector.tsx
organisms: InputToolbar.tsx
组件:      ChatInput.tsx

Step 3 注册:
kui/index.ts 按层级导出所有新增组件

Step 4 Demo:
pages/ChatInputDemo.tsx — AntD 风格导航 + 各组件独立 Demo

Step 5 路由:
routes.tsx → { path: 'kui', element: <ChatInputDemo /> }
```
