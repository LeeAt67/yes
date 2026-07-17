import zhCN from './zh-CN.json'
import enUS from './en-US.json'

/** 国际化资源映射 */
const resources: Record<string, Record<string, unknown>> = {
  'zh-CN': zhCN,
  'en-US': enUS,
}

let currentLang = 'zh-CN'

/**
 * 设置当前语言。
 *
 * @param lang - 语言代码
 */
export const setLanguage = (lang: string) => {
  if (resources[lang]) currentLang = lang
}

/**
 * 获取国际化文案。
 *
 * @param key - 点号分隔的 key，如 `'auth.status.not_logged_in'`
 * @param vars - 变量插值，用单花括号 `{var}`
 * @returns 翻译后的文案
 *
 * @example t('common.ok') // '确定'
 * @example t('auth.status.not_logged_in') // '未登录'
 */
export const t = (key: string, vars?: Record<string, string | number>): string => {
  const keys = key.split('.')
  let result: unknown = resources[currentLang]

  for (const k of keys) {
    if (result && typeof result === 'object' && k in result) {
      result = (result as Record<string, unknown>)[k]
    } else {
      return key // 回退显示 key 本身
    }
  }

  if (typeof result !== 'string') return key

  // 单花括号插值
  if (vars) {
    return result.replace(/\{(\w+)\}/g, (_, name) => String(vars[name] ?? `{${name}}`))
  }

  return result
}
