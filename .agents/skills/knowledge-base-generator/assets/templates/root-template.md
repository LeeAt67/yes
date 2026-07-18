# 项目知识库文档

自动生成于 [DATE]

## 项目概览

[PROJECT_NAME] 是一个 [项目类型描述]，主要提供 [核心功能描述]。

## 知识库结构

本项目采用分层文档结构，每个目录都有独立的 `AGENTS.md` 文件来描述其职责和实现细节：

### 文档层级

```
项目根目录/
├── AGENTS.md                    # 本文件：项目总览和知识库索引
└── [BASE_DIR]/                  # 源代码目录
    ├── modules/                 # 业务模块
    │   ├── [Module1]/
    │   │   └── AGENTS.md       # 模块文档
    │   └── [Module2]/
    │       └── AGENTS.md
    ├── components/              # 通用组件
    │   ├── [Component1]/
    │   │   └── AGENTS.md       # 组件文档
    │   └── [Component2]/
    │       └── AGENTS.md
    ├── pages/                   # 页面
    │   ├── [Page1]/
    │   │   └── AGENTS.md       # 页面文档
    │   └── [Page2]/
    │       └── AGENTS.md
    └── store/                   # 全局状态
        ├── [Store1]/
        │   └── AGENTS.md       # 状态文档
        └── [Store2]/
            └── AGENTS.md
```

## 如何使用知识库

### 查找文档

1. **按功能查找**：从模块文档开始，了解业务功能的整体结构
2. **按组件查找**：直接进入组件目录查看组件文档
3. **按页面查找**：从页面文档了解用户交互流程
4. **按状态查找**：从状态管理文档了解数据流转

### 文档类型说明

| 文档类型                 | 位置                     | 包含内容                                   |
| ------------------------ | ------------------------ | ------------------------------------------ |
| **模块文档** (Module)    | `modules/*/AGENTS.md`    | 业务模块概览、功能页面、通用组件、状态管理 |
| **组件文档** (Component) | `components/*/AGENTS.md` | 组件职责、数据结构、渲染逻辑、技术栈       |
| **页面文档** (Page)      | `pages/*/AGENTS.md`      | 页面功能、子组件、页面流程、路由配置       |
| **状态文档** (State)     | `store/*/AGENTS.md`      | 数据结构、API、数据来源、使用场景          |

### 阅读建议

**首次了解项目**：

1. 阅读本文档了解项目整体结构
2. 浏览主要模块的 AGENTS.md 了解业务功能
3. 根据需要深入具体组件或页面文档

**开发新功能**：

1. 查找相关模块的 AGENTS.md 了解现有架构
2. 查看相关组件和页面的实现模式
3. 参考状态管理文档了解数据流

**修改现有功能**：

1. 定位到具体的组件/页面文档
2. 查看其依赖的状态和子组件
3. 理解数据流和渲染逻辑后再修改

## 文档导航

本知识库采用分层结构：根文档 → 目录文档 → 实现细节。

### 目录索引

#### 📦 业务模块（Module）

- [模块1名称]([模块1路径]/AGENTS.md) - [模块1功能描述]
- [模块2名称]([模块2路径]/AGENTS.md) - [模块2功能描述]

#### 🎨 通用组件（Generic Component）

- [组件1名称]([组件1路径]/AGENTS.md) - [组件1功能描述]

#### ⚙️ 业务组件（Business Component）

- [组件2名称]([组件2路径]/AGENTS.md) - [组件2功能描述]

#### 📄 页面（Page）

- [页面1名称]([页面1路径]/AGENTS.md) - [页面1功能描述]
- [页面2名称]([页面2路径]/AGENTS.md) - [页面2功能描述]

#### 🔄 状态管理（State）

- [状态1名称]([状态1路径]/AGENTS.md) - [状态1功能描述]
- [状态2名称]([状态2路径]/AGENTS.md) - [状态2功能描述]

## 技术栈

### 核心框架

- **前端框架**: React [VERSION]
- **状态管理**: [MobX / Redux / Context API]
- **路由管理**: [React Router / Next.js]
- **构建工具**: [Webpack / Vite / Next.js]

### 主要依赖库

- **UI 组件库**: [Ant Design / Material-UI / 自研组件库]
- **样式方案**: [CSS Modules / Styled Components / Tailwind CSS]
- **数据请求**: [Axios / Fetch / SWR / React Query]
- **其他核心库**: [根据实际项目填充]

### 开发工具

- **语言**: TypeScript / JavaScript
- **代码规范**: ESLint, Prettier
- **测试框架**: [Jest / Vitest / Testing Library]
- **版本控制**: Git

## 开发规范

### 目录组织

[根据实际项目的目录组织规范填充]

## 更新说明

本知识库由 `knowledge-base-generator` skill 自动生成。

- **生成时间**: [DATE]
- **覆盖范围**: [BASE_DIR] 目录
- **文档总数**: [TOTAL_COUNT] 个

### 维护知识库

**自动更新**：运行生成工具并使用 `--overwrite` 选项

**手动补充**：在 `<!-- MANUAL ADDITIONS START -->` 和 `<!-- MANUAL ADDITIONS END -->` 标记之间添加内容，这些内容在自动更新时会被保留

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
