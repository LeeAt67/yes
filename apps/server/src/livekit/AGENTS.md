# LiveKitModule — 语音/视频通话模块

## 目录

```
livekit/
├── AGENTS.md
├── livekit.module.ts       # NestJS Module 注册
├── livekit.service.ts      # Token 签发（livekit-server-sdk）
├── livekit.controller.ts   # POST /api/livekit/token + POST /api/livekit/tts
└── tts.service.ts          # TTS 语音合成代理
```

## API

| 端点 | 鉴权 | 说明 |
|------|------|------|
| `POST /api/livekit/token` | JWT | 签发进入 LiveKit 房间的 Access Token |
| `POST /api/livekit/tts` | JWT | TTS 文本转语音合成 |

## Token 签发

- 依赖环境变量：`LIVEKIT_API_KEY`、`LIVEKIT_API_SECRET`、`LIVEKIT_WS_URL`
- 从 JWT payload 中提取 `userId` 作为 LiveKit `identity`
- 每通电话对应一个房间，房间名格式：`room_${conversationId}`

## TTS 合成

- 依赖环境变量：`TTS_API_URL`、`TTS_API_KEY`
- 请求格式：`{ text, voice?, speed? }`
- 返回 `audio/mpeg` 格式 Buffer
- **TTS_API_KEY 待替换为实际服务商**

## 生命周期

- LiveKit Token 默认有效期为 AccessToken 默认值（6 小时）
- 通话结束 → 前端断开 Room → LiveKit Server 自动清理房间
