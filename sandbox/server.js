/**
 * 轻量沙箱服务 — Docker 容器内运行的 HTTP API。
 *
 * 端点：
 *   POST /run       执行代码（node / python3）
 *   GET  /health    健康检查
 *   GET  /fs/list?path=/workspace  列出目录
 *   POST /fs/read   读取文件
 *   POST /fs/write  写入文件
 *   POST /fs/delete 删除文件
 *
 * 安全限制：
 *   - 最大执行时间 30s
 *   - 最大输出 512KB
 *   - 代码长度限制 64KB
 *   - 仅允许白名单命令
 */
const http = require('http')
const { execFile } = require('child_process')
const fs = require('fs')
const path = require('path')

const WORKSPACE = process.env.WORKSPACE || path.join(__dirname, 'workspace')
const PORT = 3002
const MAX_EXEC_TIME = 30_000
const MAX_OUTPUT = 512 * 1024

/** 解析 JSON body */
const parseBody = (req) =>
  new Promise((resolve) => {
    const chunks = []
    req.on('data', (c) => chunks.push(c))
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString())) }
      catch { resolve(null) }
    })
  })

/** 发送 JSON 响应 */
const json = (res, code, data) => {
  res.writeHead(code, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(data))
}

/** 执行代码 */
const runCode = (language, code, input = '') =>
  new Promise((resolve) => {
    const cmd = language === 'python' ? 'python3' : 'node'

    // 写入临时文件
    const ext = language === 'python' ? '.py' : '.js'
    const filePath = path.join(WORKSPACE, `_temp_${Date.now()}${ext}`)
    fs.writeFileSync(filePath, code)

    const child = execFile(cmd, [filePath], {
      cwd: WORKSPACE,
      timeout: MAX_EXEC_TIME,
      maxBuffer: MAX_OUTPUT,
      env: { ...process.env, HOME: '/tmp' },
    })

    let stdout = ''
    let stderr = ''

    child.stdout.on('data', (d) => { stdout += d })
    child.stderr.on('data', (d) => { stderr += d })

    // 写入 stdin
    if (input) {
      child.stdin.write(input)
      child.stdin.end()
    }

    child.on('close', (code) => {
      // 清理临时文件
      try { fs.unlinkSync(filePath) } catch {}
      resolve({
        stdout: stdout.slice(0, MAX_OUTPUT),
        stderr: stderr.slice(0, MAX_OUTPUT),
        exitCode: code,
      })
    })

    child.on('error', (err) => {
      try { fs.unlinkSync(filePath) } catch {}
      resolve({ stdout: '', stderr: err.message, exitCode: -1 })
    })
  })

/** 安全路径校验：防止 ../ 越权 */
const safePath = (p) => {
  const resolved = path.resolve(WORKSPACE, p.startsWith('/') ? p.slice(1) : p)
  if (!resolved.startsWith(WORKSPACE)) return null
  return resolved
}

const server = http.createServer(async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    return res.end()
  }

  const url = new URL(req.url, `http://localhost:${PORT}`)

  try {
    // GET /health
    if (req.method === 'GET' && url.pathname === '/health') {
      return json(res, 200, { ok: true })
    }

    // POST /run
    if (req.method === 'POST' && url.pathname === '/run') {
      const body = await parseBody(req)
      if (!body || !body.code || !body.language) {
        return json(res, 400, { error: 'Missing code or language' })
      }
      if (body.code.length > 64 * 1024) {
        return json(res, 400, { error: 'Code too long (max 64KB)' })
      }
      if (!['python', 'javascript'].includes(body.language)) {
        return json(res, 400, { error: 'Unsupported language. Use "python" or "javascript"' })
      }
      const result = await runCode(body.language, body.code, body.input)
      return json(res, 200, result)
    }

    // GET /fs/list
    if (req.method === 'GET' && url.pathname === '/fs/list') {
      const p = url.searchParams.get('path') || '/workspace'
      const sp = safePath(p)
      if (!sp) return json(res, 403, { error: 'Path out of workspace' })
      const entries = fs.readdirSync(sp, { withFileTypes: true })
      return json(res, 200, entries.map((e) => ({ name: e.name, isDir: e.isDirectory() })))
    }

    // POST /fs/read
    if (req.method === 'POST' && url.pathname === '/fs/read') {
      const body = await parseBody(req)
      if (!body?.path) return json(res, 400, { error: 'Missing path' })
      const sp = safePath(body.path)
      if (!sp) return json(res, 403, { error: 'Path out of workspace' })
      if (!fs.existsSync(sp)) return json(res, 404, { error: 'Not found' })
      const content = fs.readFileSync(sp, 'utf-8').slice(0, MAX_OUTPUT)
      return json(res, 200, { content })
    }

    // POST /fs/write
    if (req.method === 'POST' && url.pathname === '/fs/write') {
      const body = await parseBody(req)
      if (!body?.path || body.content === undefined) return json(res, 400, { error: 'Missing path or content' })
      if (body.content.length > 64 * 1024) return json(res, 400, { error: 'Content too long' })
      const sp = safePath(body.path)
      if (!sp) return json(res, 403, { error: 'Path out of workspace' })
      fs.mkdirSync(path.dirname(sp), { recursive: true })
      fs.writeFileSync(sp, body.content)
      return json(res, 200, { ok: true })
    }

    // POST /fs/delete
    if (req.method === 'POST' && url.pathname === '/fs/delete') {
      const body = await parseBody(req)
      if (!body?.path) return json(res, 400, { error: 'Missing path' })
      const sp = safePath(body.path)
      if (!sp) return json(res, 403, { error: 'Path out of workspace' })
      if (!fs.existsSync(sp)) return json(res, 404, { error: 'Not found' })
      fs.rmSync(sp, { recursive: true, force: true })
      return json(res, 200, { ok: true })
    }

    json(res, 404, { error: 'Not found' })
  } catch (err) {
    json(res, 500, { error: err.message })
  }
})

server.listen(PORT, '0.0.0.0', () => {
  // 确保 workspace 存在
  fs.mkdirSync(WORKSPACE, { recursive: true })
  console.log(`Sandbox running on http://0.0.0.0:${PORT}`)
})
