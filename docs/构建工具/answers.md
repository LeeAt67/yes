# 构建工具 — 问题解答

> 记录构建工具相关问题的解决方案。

---

## Q1: Rspack 热更新（HMR）不生效

**日期**：2026-07-18

**根因**：React Refresh 需要**两端配合**——SWC 在编译时注入 refresh 代码 + devServer 提供 WebSocket 通信链路。缺任一都不生效。

**解决方案**：
1. SWC loader 添加 `react.refresh: isDev`
2. devServer 显式设置 `hot: true`

**关键代码**：
```js
// rspack.config.mjs — SWC 侧
transform: {
  react: {
    runtime: 'automatic',
    refresh: isDev,    // ← 关键
  },
}

// devServer 侧
devServer: {
  hot: true,           // ← 关键
  port: 8000,
  historyApiFallback: true,
}
```
