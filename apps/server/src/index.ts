import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { serve } from '@hono/node-server'
import { chatRouter } from './routes/chat'

/**
 * YES 后端服务。
 *
 * 提供 REST API + SSE 流式响应。
 * 默认监听 3001 端口。
 */
const app = new Hono()

// 中间件
app.use('*', cors({ origin: '*' }))
app.use('*', logger())

// 健康检查
app.get('/api/health', (c) => c.json({ status: 'ok', timestamp: Date.now() }))

// 聊天路由
app.route('/api/chat', chatRouter)

const PORT = Number(process.env.PORT) || 8001

console.log(`🚀 YES Server running on http://localhost:${PORT}`)
serve({ fetch: app.fetch, port: PORT })
