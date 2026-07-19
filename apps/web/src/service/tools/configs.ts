/**
 * 工具显示配置注册表 — 控制每个工具在 UI 中的展示方式。
 *
 *       的 TOOL_CONFIGS 模式：
 *   getToolConfig(name) → ToolDisplayConfig
 *   未匹配时返回 Default 配置。
 */

import type { ToolDisplayConfig } from './types'

/**
 * 全局工具显示配置表。
 *
 * 每个工具对应一个 ToolDisplayConfig，描述其输入栏和结果栏的渲染方式。
 * 新增工具时在此添加条目即可，ToolRenderer 会自动路由。
 */
export const TOOL_CONFIGS: Record<string, ToolDisplayConfig> = {

  // ── 默认回退 ──
  Default: {
    input: {
      type: 'collapsible',
      title: (input: unknown) =>
        typeof input === 'object' ? JSON.stringify(input).slice(0, 80) : String(input).slice(0, 80),
      contentType: 'text',
      defaultOpen: false,
    },
    result: {
      type: 'collapsible',
      title: '结果',
      contentType: 'text',
    },
  },

  // ── 联网搜索 ──
  web_search: {
    input: {
      type: 'one-line',
      icon: 'search',
      label: '联网搜索',
      getValue: (input: unknown) => {
        const obj = input as Record<string, unknown> | undefined
        return String(obj?.query ?? '')
      },
    },
    result: {
      type: 'search-results',
      results: [],
    },
  },
}

/**
 * 获取工具的显示配置，未注册时返回 Default。
 *
 * @param toolName - 工具名称
 * @returns 显示配置
 */
export const getToolConfig = (toolName: string): ToolDisplayConfig => {
  return TOOL_CONFIGS[toolName] ?? TOOL_CONFIGS.Default
}
