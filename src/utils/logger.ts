/**
 * 日志工具 — 统一日志输出，禁止直接使用 console。
 *
 * 用法：
 *   const logger = createLogger('模块:子模块')
 *   logger.warn('Failed to get data:', error)
 *   logger.error('Unexpected state:', details)
 *   logger.debug('Internal value:', value)
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogFn {
  (...args: unknown[]): void
}

interface Logger {
  debug: LogFn
  info: LogFn
  warn: LogFn
  error: LogFn
}

/**
 * 创建带命名空间的日志实例。
 *
 * @param namespace - 模块命名，格式 `大模块:子模块`
 * @returns Logger 实例
 */
export const createLogger = (namespace: string): Logger => {
  const isDev = process.env.NODE_ENV !== 'production'

  const fmt = (level: LogLevel, args: unknown[]) => {
    const prefix = `[${namespace}]`
    return [prefix, ...args]
  }

  return {
    debug: (...args) => {
      if (isDev) console.debug(...fmt('debug', args))
    },
    info: (...args) => {
      console.info(...fmt('info', args))
    },
    warn: (...args) => {
      console.warn(...fmt('warn', args))
    },
    error: (...args) => {
      console.error(...fmt('error', args))
    },
  }
}
