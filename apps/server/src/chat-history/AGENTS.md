# ChatHistory 模块

聊天记录持久化，通过 Prisma 读写 `chat_messages` 表。

## 文件

| 文件 | 职责 |
|------|------|
| `chat-history.service.ts` | `findByConversation` / `replaceConversation` / `deleteConversation`，按 userId + conversationId 操作 |
| `chat-history.controller.ts` | REST endpoints，JWT 鉴权 |
| `chat-history.module.ts` | 模块定义，依赖 PrismaModule |

## API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/chat-history/:conversationId` | 获取会话全部消息 |
| PUT | `/api/chat-history/:conversationId` | 整组替换消息 `{ messages: Array<{role, content, createdAt}> }` |
| DELETE | `/api/chat-history/:conversationId` | 删除会话全部消息 |

## 数据模型

```
ChatMessage {
  id: Int @id
  userId: Int (FK → User)
  role: String ("user" | "assistant")
  content: String
  conversationId: String
  createdAt: DateTime
}
```
