# ui (通用组件库)

> 📂 路径：`packages/ui/src/`
> 🏷️ 类型：**Module** (跨项目 UI 组件)

---

## 概览

React 通用 UI 组件集合，与业务逻辑解耦，通过 `@yes/ui` 导入。

## 组件清单

| 组件 | 类型 | 说明 |
|------|------|------|
| `Button` | 通用 | shadcn/ui 扩展，含 toolbar/primaryCircle 等变体 |
| `IconButton` | 通用 | 封装 Button，默认 toolbar + iconSm |
| `Sidebar` | 业务 | PC 固定 / 移动端覆盖层双模式 |
| `SidebarHeader` | 通用 | Logo + 标题 + 折叠/关闭按钮 |
| `SidebarNav` | 通用 | 导航链接列表，支持折叠 |

## 组件规范

所有公共组件必须满足：

```typescript
// forwardRef + classNames prop + cn 合并
const MyComponent = forwardRef<HTMLDivElement, MyComponentProps>(
  ({ className, classNames }, ref) => (
    <div ref={ref} className={cn('base-class', classNames?.root, className)}>
```

- `classNames`：细粒度定制（`root`, `title`, `link`...）
- `className`：整体覆盖
- `displayName`：必须设置

## `Sidebar` 的双模式

**PC 端**：`flex shrink-0` 固定左侧，宽度 `w-16`（折叠）/ `w-56`（展开）。

**移动端**：`fixed inset-y-0 left-0 z-50` 全屏覆盖层 + 半透明遮罩。点击遮罩或导航链接 → 自动关闭。

模式切换由 `isMobile` prop 驱动（来自 `GlobalStore`），不是 CSS 媒体查询。

### SidebarHeader 的三种分支

| 状态 | 布局 |
|------|------|
| PC 折叠 | 仅居中切换图标 |
| PC 展开 | Logo + 标题（左）`justify-between` 折叠图标（右） |
| 移动端 | Logo + 标题（左）`justify-between` ✕ 关闭（右） |

折叠图标来自 `sidebar-toggle.svg`，通过 `@svgr/webpack` 以 React 组件导入。
