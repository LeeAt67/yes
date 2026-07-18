# shared (通用工具库)

> 📂 路径：`packages/shared/src/`
> 🏷️ 类型：**Module** (跨平台工具)

---

## 概览

被 `@yes/web`、`@yes/ui` 引用的零依赖工具集。npm workspace 自动软链接到 `node_modules/@yes/shared`。

## 导出清单

| 模块 | 导出 | 用途 |
|------|------|------|
| `lib/utils.ts` | `cn()` | Tailwind 类名合并（clsx + tailwind-merge） |
| `lib/tokens.ts` | `tokens`, `TokenEntry` | KUI 设计 Token 定义 |
| `logger.ts` | `createLogger()`, `Logger` | 统一日志（生产不打印 debug） |
| `req.ts` | `Req`, `ReqError`, `ReqConfig`, `ReqResult` | Go 风格 HTTP 请求基类 |

## `Req` 类 — Go 风格错误处理

**核心理念**：跨网络边界的调用永不抛异常，通过 `[data, error]` 元组区分成功/失败。

```typescript
const api = new Req({ baseURL: 'http://localhost:3001' })

// GET — 永不抛异常
const [user, err] = await api.get<User>('/api/user/1')
if (err) return handleError(err)

// 流式 — 返回原始 Response 供管道消费
const [res, err] = await api.stream('/api/chat', { content })
```

**为什么只有跨边界用 Go 风格？** 同进程内的 Service → Controller 调用应该抛异常，让 NestJS 的 `ExceptionFilter` 统一转 HTTP 状态码。Go 风格只适用于网络 I/O。

### 特性

- 超时：默认 30s，可配置
- 信号合并：外部 `AbortSignal` + 超时信号自动合并
- JSON 自动序列化/反序列化
- `stream()` 返回原始 `Response`（不消费 Body）
