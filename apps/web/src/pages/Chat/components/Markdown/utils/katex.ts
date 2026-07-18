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

/**
 * 预处理 Markdown 内容：定界符统一 + 特殊标签转义。
 *
 * @param input - 原始内容
 * @param isTyping - 是否正在流式输出；为 true 时会裁剪末尾未闭合的定界符
 * @returns 可直接传入 react-markdown 的内容
 */
export const preprocessContent = (input: string, isTyping = false): string => {
  if (!input) return ''

  // 转义 <think> 标签（防止被 rehypeRaw 当作 HTML 吃掉）
  const escaped = input
    .replace(/<think>/g, '&lt;think&gt;')
    .replace(/<\/think>/g, '&lt;/think&gt;')

  const replaced = replaceDelimiters(escaped)

  // 流式时裁剪末尾未闭合的定界符，防止后续正文被误吞为公式
  return isTyping ? trimUnclosedDelimiters(replaced) : replaced
}
