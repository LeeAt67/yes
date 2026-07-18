# chat

> 📂 路径：`apps/server/src/chat/`
> 🏷️ 类型：**Module** (业务模块 — LLM API 代理)

---

## 概览

**SSE 流式代理**：前端请求 → Zod 校验 → `fetch` LLM API (stream: true) → `AsyncGenerator` 逐 token 产出 → Express `res.write()` SSE 输出。

核心价值：**前端不需要知道下游 LLM 的格式**（OpenAI 还是 Mimo 无所谓），统一消费 `{ token, done, error }` 格式。

## 核心概念

- **AsyncGenerator 作为流抽象**：`ChatService.streamChat()` 返回 `AsyncGenerator<Record<string, unknown>>`，Controller 用 `for await` 消费。这比 `ReadableStream` 更直观：不需要手动 `controller.enqueue/close`，`yield` 即输出。
- **管道解析 LLM SSE**：`response.body.pipeThrough(new TextDecoderStream()).getReader()` 将字节流转为文本流，然后 `while(true)` 逐行解析 `data:` 行。

> 为什么不用 `EventSource`？因为 HTTP `fetch` 的流式消费需要 POST 请求，而浏览器原生 `EventSource` 只支持 GET。

## 路由表

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|:--:|------|
| POST | `/api/chat` | JWT | 接收 `{ msgId, conversationId, query, modelConfig }`，返回 SSE 流 |

## 文件职责

| 文件 | 职责 |
|------|------|
| `chat.module.ts` | 注册 Controller + Service |
| `chat.controller.ts` | Zod 校验 → SSE 响应头 → `for await` 消费 Service 流 → `res.write()` |
| `chat.service.ts` | `fetch(LLM_API_URL)` → 管道解析 → `yield { token/done/error }` |

## 数据流

```
POST /api/chat { query, modelConfig: { model, maxTokens, temperature... } }
  → Zod 校验 (chatRequestSchema)
  → fetch(LLM_API_URL, { body: { model, messages, stream: true } })
    → LLM 返回 data: {"choices":[{"delta":{"content":"xx"}}]}
      → TextDecoderStream → 逐行解析
        → yield { token: "xx" }
        → yield { done: true } (收到 [DONE])
  → Controller for await → res.write(`data: {json}\n\n`)
```

## 模型配置收敛

`modelConfig` 独立对象包含所有模型参数 (`model`, `enableThinking`, `webSearchStatus`, `maxTokens`, `temperature`)，Zod schema 中全为 `optional()`，运行时通过 `DEFAULT_MODEL_CONFIG` 展开默认值。扩展新参数只需在对象内加字段，不影响顶层 API 合同。

## 与其他模块的关系

- **AuthModule**：通过 `@UseGuards(JwtAuthGuard)` 保护。
- **LLM_API_URL / LLM_API_KEY**：从 `process.env` 读取，无兜底，缺失启动即报错。
