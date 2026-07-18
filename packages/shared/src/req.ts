import { createLogger } from './logger'

const logger = createLogger('shared:req')

/**
 * Go 风格的请求结果 — 永远不抛异常，通过元组区分成功/失败。
 *
 * 用法：
 *   const [data, err] = await req.get<User>('/api/user/1')
 *   if (err) return handleError(err)
 *   console.log(data.name)
 */
export type ReqResult<T = unknown> = Promise<
  | readonly [T, null]
  | readonly [null, ReqError]
>

/**
 * 请求错误 — 包含 HTTP 状态码和上下文信息。
 */
export class ReqError extends Error {
  /** HTTP 状态码 */
  status: number
  /** 请求 URL */
  url: string
  /** 请求方法 */
  method: string
  /** 响应体文本（如果有） */
  body?: string

  constructor(message: string, status: number, url: string, method: string, body?: string) {
    super(message)
    this.name = 'ReqError'
    this.status = status
    this.url = url
    this.method = method
    this.body = body
  }
}

/** Req 配置项 */
export interface ReqConfig {
  /** API 基地址，例如 http://localhost:3001 */
  baseURL?: string
  /** URL 前缀，例如 /api */
  prefix?: string
  /** 默认请求头 */
  headers?: Record<string, string>
  /** 请求超时（毫秒） */
  timeout?: number
}

/**
 * 请求基类 — Go 风格错误处理。
 *
 * ```
 * const api = new Req({ baseURL: 'http://localhost:3001', prefix: '/api' })
 *
 * // GET — 返回 [data, null] 或 [null, error]
 * const [user, err] = await api.get<User>('/user/1')
 *
 * // POST
 * const [res, err] = await api.post('/chat', { content: 'hi' })
 *
 * // 流式请求 — 返回原始 Response 供管道消费
 * const [stream, err] = await api.stream('/chat', { content: 'hi' })
 * ```
 */
export class Req {
  private baseURL: string
  private prefix: string
  private defaultHeaders: Record<string, string>
  private timeout: number

  constructor(config: ReqConfig = {}) {
    this.baseURL = config.baseURL ?? ''
    this.prefix = config.prefix ?? ''
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      ...config.headers,
    }
    this.timeout = config.timeout ?? 30_000
  }

  // ==================== 公开方法 ====================

  /** GET 请求 */
  get<T = unknown>(path: string, signal?: AbortSignal): ReqResult<T> {
    return this.request<T>(path, 'GET', undefined, signal)
  }

  /** POST 请求 */
  post<T = unknown>(path: string, body?: unknown, signal?: AbortSignal): ReqResult<T> {
    return this.request<T>(path, 'POST', body, signal)
  }

  /** PUT 请求 */
  put<T = unknown>(path: string, body?: unknown, signal?: AbortSignal): ReqResult<T> {
    return this.request<T>(path, 'PUT', body, signal)
  }

  /** DELETE 请求 */
  delete<T = unknown>(path: string, signal?: AbortSignal): ReqResult<T> {
    return this.request<T>(path, 'DELETE', undefined, signal)
  }

  /**
   * 流式请求 — 返回原始 Response，由调用方通过 ReadableStream 管道消费。
   *
   * 用法：
   *   const [res, err] = await api.stream('/chat', { content: 'hi' })
   *   if (err) return
   *   const reader = res.body!.pipeThrough(new TextDecoderStream()).getReader()
   */
  stream(path: string, body?: unknown, signal?: AbortSignal): ReqResult<Response> {
    return this.requestRaw(path, 'POST', body, signal)
  }

  // ==================== 内部实现 ====================

  /** 构建完整 URL */
  private buildURL(path: string): string {
    return `${this.baseURL}${this.prefix}${path}`
  }

  /** 创建带超时的 AbortController */
  private createTimeoutSignal(externalSignal?: AbortSignal): {
    signal: AbortSignal
    clear: () => void
  } {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(new Error('Request timeout')), this.timeout)

    const clear = () => clearTimeout(timeoutId)

    if (!externalSignal) return { signal: controller.signal, clear }

    // 合并外部信号和超时信号：任一触发都 abort
    const combined = new AbortController()
    const onAbort = () => combined.abort(controller.signal.reason || externalSignal.reason)
    externalSignal.addEventListener('abort', onAbort, { once: true })
    controller.signal.addEventListener('abort', onAbort, { once: true })

    return { signal: combined.signal, clear: () => { clear(); externalSignal.removeEventListener('abort', onAbort) } }
  }

  /** 错误包装 */
  private toError(message: string, res: Response, url: string, method: string): ReqError {
    return new ReqError(message, res.status, url, method)
  }

  /**
   * 通用请求 — 自动 JSON 解析。
   *
   * @returns [data, null] 成功或 [null, ReqError] 失败
   */
  private async request<T>(
    path: string,
    method: string,
    body?: unknown,
    externalSignal?: AbortSignal,
  ): ReqResult<T> {
    const url = this.buildURL(path)
    const { signal, clear } = this.createTimeoutSignal(externalSignal)

    try {
      const res = await fetch(url, {
        method,
        headers: this.defaultHeaders,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal,
      })
      clear()

      if (!res.ok) {
        const text = await res.text().catch(() => '')
        logger.warn(`Req ${method} ${path} → ${res.status}`)
        return [null, new ReqError(text || res.statusText, res.status, url, method, text)]
      }

      // 204 No Content
      if (res.status === 204) return [null as T, null]

      const data = await res.json() as T
      return [data, null]
    } catch (err: unknown) {
      clear()
      if (err instanceof DOMException && err.name === 'AbortError') {
        const msg = externalSignal?.aborted ? 'Request cancelled' : 'Request timeout'
        return [null, new ReqError(msg, 0, url, method)]
      }
      logger.error(`Req ${method} ${path} failed:`, err)
      return [null, new ReqError(
        err instanceof Error ? err.message : 'Unknown error',
        0, url, method,
      )]
    }
  }

  /**
   * 原始请求 — 返回 Response 而不解析 JSON（用于流式）。
   */
  private async requestRaw(
    path: string,
    method: string,
    body?: unknown,
    externalSignal?: AbortSignal,
  ): ReqResult<Response> {
    const url = this.buildURL(path)
    const { signal, clear } = this.createTimeoutSignal(externalSignal)

    try {
      const res = await fetch(url, {
        method,
        headers: this.defaultHeaders,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal,
      })
      clear()

      if (!res.ok) {
        logger.warn(`Req stream ${method} ${path} → ${res.status}`)
        return [null, this.toError(res.statusText, res, url, method)]
      }

      return [res, null]
    } catch (err: unknown) {
      clear()
      if (err instanceof DOMException && err.name === 'AbortError') {
        const msg = externalSignal?.aborted ? 'Request cancelled' : 'Request timeout'
        return [null, new ReqError(msg, 0, url, method)]
      }
      logger.error(`Req stream ${method} ${path} failed:`, err)
      return [null, new ReqError(
        err instanceof Error ? err.message : 'Unknown error',
        0, url, method,
      )]
    }
  }
}
