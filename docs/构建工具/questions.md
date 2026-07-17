# 构建工具 — 常见问题

> 记录开发过程中遇到的构建工具相关问题。

---

## Q1: Rspack 热更新（HMR）不生效

**日期**：2026-07-18

**现象**：修改 `.tsx` 文件后浏览器全量刷新，不会局部更新组件。控制台报 WebSocket 连接失败。

**排查方向**：
- SWC loader 是否开启了 `react.refresh`
- devServer 是否显式配置了 `hot: true`
- `@rspack/plugin-react-refresh` 是否正确导入
