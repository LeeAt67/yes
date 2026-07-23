/**
 * 内联公式正则：匹配 `\(...\)`，捕获内部内容（支持多行、转义字符）。
 * 对应 remark-math 行内语法 `$...$`。
 */
const INLINE_MATH_RE = /\\\(((?:\\[^]|[^\\])*?)\\\)/g

/**
 * 块级公式正则：匹配 `\[...\]`，捕获内部内容（支持多行、转义字符）。
 * 对应 remark-math 块级语法 `$$...$$`。
 */
const DISPLAY_BRACKET_RE = /\\\[((?:\\[^]|[^\\])*?)\\\]/g

/**
 * equation 环境正则：匹配 `\begin{equation}...\end{equation}`。
 */
const EQUATION_ENV_RE = /\\begin\{equation\}((?:\\[^]|[^\\])*?)\\end\{equation\}/g

/**
 * 将输入中的各种 LaTeX 定界符规范化：
 *
 * - `\(...\)`                          → `$...$`（行内公式，remark-math inline）
 * - `\[...\]`                          → `$$...$$`（块级公式，remark-math display）
 * - `\begin{equation}...\end{equation}` → `$$...$$`（块级公式）
 * - `$$...$$`                          → 保持不变
 *
 * 关键：`\(...\)` 必须转为单 `$`，而非 `$$`。
 * `remark-math` 将 `$$` 视为 display math（块元素），若出现在段落中间会破坏行内排版。
 *
 * @param input - 原始 Markdown 内容
 * @returns 定界符规范化后的内容
 */
export const replaceDelimiters = (input: string): string => {
  if (!input) return ''

  // 去行末空格，避免影响公式渲染
  let result = input.replace(/[\t ]+$/gm, '')

  // \begin{equation}...\end{equation} → $$...$$（块级）
  result = result.replace(EQUATION_ENV_RE, (_, content: string) => `$$${content}$$`)

  // \[...\] → $$...$$（块级）
  result = result.replace(DISPLAY_BRACKET_RE, (_, content: string) => `$$${content}$$`)

  // \(...\) → $...$（行内）— 不能用 $$，否则 remark-math 渲染为块元素破坏行内排版
  result = result.replace(INLINE_MATH_RE, (_, content: string) => `$${content}$`)

  return result
}

/**
 * 流式中末尾可能残留未闭合的定界符（LLM 还没输出完），
 * 裁剪掉这些残留前缀，避免它把后续正文全部吃进公式。
 *
 * 处理的残留形式：
 * - 末尾的 `\(`（行内公式未闭合）
 * - 末尾的 `\[`（块级公式未闭合）
 * - 末尾的 `$$`（奇数个 `$$` 时最后一个未闭合）
 *
 * @param text - 已做定界符替换后的内容
 * @returns 裁剪末尾未闭合定界符后的内容
 */
const trimUnclosedDelimiters = (text: string): string => {
  let result = text

  // $$ 计数为奇数 → 最后一个 $$ 是未闭合的块级公式
  // 补 \n$$ 临时闭合，保留已输出内容可见，避免页面假死
  const ddCount = (result.match(/\$\$/g) ?? []).length
  if (ddCount % 2 !== 0) {
    result = result.trimEnd() + '\n$$'
  }

  // 单 $ 计数为奇数 → 行内公式未闭合，末尾补 $ 闭合
  const singleCount = (result.match(/(?<!\$)\$(?!\$)/g) ?? []).length
  if (singleCount % 2 !== 0) {
    result = result + '$'
  }

  return result
}

/** 思考块数据 */
export interface ThinkBlock {
  content: string
  done: boolean
}

/**
 * 将 <think>\0...\0 分隔符拆分为思考块数组，并返回纯正文。
 *
 * 兼容两种格式：
 * - 流式实时: <think>\0...\0（\0 = null 字符，标记为服务端注入）
 * - 历史回放: <think>...</think>（\0 在 JSON/DB 存储中可能丢失）
 */
const splitThinkBlocks = (input: string, isTyping: boolean): { clean: string; blocks: ThinkBlock[] } => {
  const THINK_OPEN = '<think>\0'
  const THINK_CLOSE = '</think>\0'
  const blocks: ThinkBlock[] = []

  // ① 先尝试 \0 分隔符（流式实时）
  let result = input
  while (true) {
    const openIdx = result.indexOf(THINK_OPEN)
    if (openIdx === -1) break
    const closeIdx = result.indexOf(THINK_CLOSE, openIdx + THINK_OPEN.length)
    if (closeIdx === -1) break

    const thinking = result.slice(openIdx + THINK_OPEN.length, closeIdx).trim()
    if (thinking) {
      blocks.push({ content: thinking, done: true })
    }
    result = result.slice(0, openIdx) + result.slice(closeIdx + THINK_CLOSE.length)
  }

  // 处理流式中未闭合的 \0 段
  if (isTyping) {
    const openIdx = result.lastIndexOf(THINK_OPEN)
    if (openIdx !== -1 && !result.includes(THINK_CLOSE, openIdx)) {
      const thinking = result.slice(openIdx + THINK_OPEN.length).trim()
      if (thinking) {
        blocks.push({ content: thinking, done: false })
      }
      result = result.slice(0, openIdx)
    }
  }

  // ② 兜底：处理不带 \0 的 <think>...</think>（历史记录，\0 可能在存储中丢失）
  if (blocks.length === 0) {
    while (true) {
      const openIdx = result.indexOf('<think>')
      if (openIdx === -1) break
      const closeIdx = result.indexOf('</think>', openIdx + 7)
      if (closeIdx === -1) break

      const thinking = result.slice(openIdx + 7, closeIdx).trim()
      if (thinking) {
        blocks.push({ content: thinking, done: true })
      }
      result = result.slice(0, openIdx) + result.slice(closeIdx + 8)
    }
  }

  // 转义残留的 <think> / </think>（用户可能输入的字面量）
  const clean = result
    .replace(/<think>/g, '&lt;think&gt;')
    .replace(/<\/think>/g, '&lt;/think&gt;')

  return { clean, blocks }
}

/** 预处理结果 */
export interface PreprocessResult {
  /** 纯正文（可安全传 ReactMarkdown） */
  content: string
  /** 思考块列表（在渲染层单独展示） */
  thinkBlocks: ThinkBlock[]
}

/**
 * 预处理 Markdown 内容：拆分思考块 + 定界符统一 + 标签转义。
 *
 * @param input - 原始内容（含 <think>\0 思考分隔符，由后端注入）
 * @param isTyping - 是否正在流式输出；为 true 时处理未闭合思考段并裁剪定界符
 * @returns 可直接传入 react-markdown 的内容 + 思考块数组
 */
export const preprocessContent = (input: string, isTyping = false): PreprocessResult => {
  if (!input) return { content: '', thinkBlocks: [] }

  const { clean, blocks } = splitThinkBlocks(input, isTyping)
  const replaced = replaceDelimiters(clean)

  return {
    content: isTyping ? trimUnclosedDelimiters(replaced) : replaced,
    thinkBlocks: blocks,
  }
}
