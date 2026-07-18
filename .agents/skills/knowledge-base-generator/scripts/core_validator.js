const fs = require('fs')
const path = require('path')

const REQUIRED_SECTIONS = {
  module: ['## 概览', '## 状态管理', '## 功能页面', '## 模块结构', '## 关联文档'],
  state: ['## 概览', '## 数据结构', '## 关联文档'],
  'business-component': ['## 概览', '## 数据结构', '## 渲染逻辑', '## 关联文档'],
  'generic-component': ['## 概览', '## 渲染逻辑'],
  page: ['## 概览', '## 数据结构', '## 子组件', '## 页面流程', '## 路由配置', '## 关联文档'],
  hook: ['## 概览', '## 输入参数', '## 返回值'],
}

const PLACEHOLDER_PATTERNS = [
  '[DIRECTORY NAME]',
  '[DATE]',
  '模板示例',
  '[模块名称]',
  '[状态名称]',
  '[组件名称]',
  '[页面名称]',
  '[描述]',
  '[路径]',
  '[数据源]',
  '[核心库]',
  '[数据结构]',
]

function validateAgentsFile(agentsPath, dirType) {
  const issues = []

  if (!fs.existsSync(agentsPath)) {
    issues.push(`File does not exist: ${agentsPath}`)
    return { valid: false, issues }
  }

  let content
  try {
    content = fs.readFileSync(agentsPath, 'utf8')
  } catch (e) {
    issues.push(`Failed to read file: ${e.message}`)
    return { valid: false, issues }
  }

  const requiredSections = REQUIRED_SECTIONS[dirType] || []
  for (const section of requiredSections) {
    if (!content.includes(section)) {
      issues.push(`Missing section: ${section}`)
    }
  }

  for (const placeholder of PLACEHOLDER_PATTERNS) {
    if (content.includes(placeholder)) {
      issues.push(`Contains placeholder: ${placeholder}`)
    }
  }

  const lines = content.split(/\r?\n/).length
  if (lines < 100) {
    issues.push(
      `Content too short (${lines} lines), minimum 100 lines required for "Serious Audit" standards. Did you miss some paragraphs?`,
    )
  }

  if (!content.includes('生成于') && !content.includes('更新')) {
    issues.push('Missing timestamp or generation marker')
  }

  return { valid: issues.length === 0, issues }
}

module.exports = {
  validateAgentsFile,
}
