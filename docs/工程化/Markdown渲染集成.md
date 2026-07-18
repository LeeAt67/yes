# Markdown 渲染集成方案

## 概述

为 Chat 页面的 AI 回复集成 Markdown 渲染能力，涵盖公式、代码高亮、HTML 安全过滤、流式性能优化四个维度。

---

## 依赖清单

### 核心渲染

| 依赖 | 版本 | 用途 |
|------|------|------|
| `react-markdown` | ^10.1.0 | Markdown → React 组件 |
| `remark-gfm` | ^4.0.1 | GFM 扩展（表格/任务列表/删除线） |
| `remark-math` | ^6.0.0 | 数学公式 AST 识别 |
| `remark-html` | ^16.0.1 | 内嵌 HTML 支持 |
| `rehype-katex` | ^7.0.1 | KaTeX 数学渲染 |
| `rehype-raw` (hast-util-raw) | ^9.1.0 | 原始 HTML → HAST 节点 |
| `katex` | ^0.16.x | KaTeX CSS + 字体 |
| `react-shiki` | ^0.11.0 | 代码语法高亮 |

### 安全

| 依赖 | 用途 |
|------|------|
| `dompurify` | HTML 净化/防 XSS |

### 排版

| 依赖 | 用途 |
|------|------|
| `@tailwindcss/typography` | prose 排版样式 |

### 构建

| 依赖 | 用途 |
|------|------|
| `css-loader` + `style-loader` | CSS `@apply` 指令支持（rspack 原生 type:css 不兼容） |

---

## 文件结构

```
apps/web/src/pages/Chat/components/Markdown/
├── index.tsx              # Markdown 主组件 + MarkdownCore + MarkdownErrorBoundary
├── index.css              # prose 排版样式 + 行号 CSS counter
├── CodeBlock.tsx          # 代码块（SafeShiki 三层降级 + InView 懒高亮 + sticky header）
├── hooks/
│   └── useInViewOnce.ts   # IntersectionObserver 单次触发
└── utils/
    ├── katex.ts           # KaTeX 定界符预处理 (\(\)/\[\] → $$)
    ├── rehypeRaw.ts       # 自定义 rehype 插件（hast-util-raw + DOMPurify）
    └── splitBlocks.ts     # 安全空行切分（blockMode 分块渲染）
```

---

## 渲染管道

### 预处理

```
原始 content
  │
  ├── <think> 转义 (&lt;think&gt;)
  │
  ├── replaceDelimiters() — 定界符规范化
  │     ├── \(...\)                          → $...$（行内，remark-math inline math）
  │     ├── \[...\]                          → $$...$$（块级）
  │     ├── \begin{equation}...\end{equation} → $$...$$（块级）
  │     └── $$...$$                          → 保持不变
  │
  └── trimUnclosedDelimiters() — 流式中 isTyping=true 时调用
        ├── $$ 奇数 → 末尾补 \n$$ 临时闭合（不删除内容，避免页面假死）
        └── 单 $ 奇数 → 末尾补 $ 闭合（同上）
```

**关键**：`\(...\)` 必须转 `$...$`（单 `$`），不可转 `$$...$$`。`remark-math` 将 `$$` 视为 display math（块元素），若出现在段落中间会破坏行内排版。

### ReactMarkdown 插件链

```typescript
<ReactMarkdown
  remarkPlugins={[remarkGfm, remarkMath, remarkHtml]}
  rehypePlugins={[rehypeRaw, rehypeKatex]}
  components={{ code: CodeBlock }}
>
  {preprocessContent(content)}
</ReactMarkdown>
```

**关键顺序**：`rehypeRaw` 必须在 `rehypeKatex` 之前——先由 rehypeRaw 解析原始 HTML 生成完整 HAST 节点，rehypeKatex 才能正确识别其中的数学公式。

---

## 代码块架构

### SafeShiki 三层降级

```
1. supportsLookbehind() === false  →  纯文本 PlainLines
2. React.lazy 加载失败            →  纯文本 PlainLines
3. ShikiErrorBoundary 抛错         →  纯文本 PlainLines
```

### 流式状态

```
isTyping=true   →  纯文本 PlainLines（保留框架 UI，仅无配色）
isTyping=false  →  grid 叠层：底层 PlainLines 撑高 + 上层 Shiki 高亮覆盖
```

### 可视区优先

```
useInViewOnce(rootMargin=300px)
  → 代码块距视口 300px 内才挂载 Shiki
  → 视口外保持纯文本占位
  → 避免长回答多个代码块同帧高亮
```

### PlainLines DOM 对齐

```
<pre>
  <code>
    <span class="line">line1</span>\n
    <span class="line">line2</span>\n
    ...
  </code>
</pre>
```

与 Shiki 输出结构完全一致，`\n` 作为 span 间独立文本节点提供唯一换行，保证两态切换不抖动。

---

## 性能优化

### blockMode 分块渲染

```
完整 content → splitMarkdownIntoBlocks()
  ↓
[block1, block2, block3, block4]（按安全空行切分）
  ↓
已完成 block → memo 冻结不重解析 (O(1))
尾块（流式） → 跟随 isTyping 重解析 (O(1))

总复杂度: O(N) 替代 O(N²)
```

### 安全空行切分规则

- 不在代码围栏 (``` / ~~~) 内切分
- 不在块级数学 ($$) 内切分
- 不在 HTML details 块内切分（保护 reasoning）
- 切分后合并相邻列表块/引用块（保持语义）

### SSE 生产者-消费者模型

```
网络读取 (全速消费 SSE)                 UI 渲染 (RAF 对齐)
     │                                       │
     ▼                                       ▼
  readLoop() ── token 累积 ──► scheduleRafFlush() ──► onToken()
                              每帧最多聚合一次

控制事件 (finish/error/usage):
  readLoop() ── flushCache() ── enqueue() ── notify() ──► 消费端
```

**架构要点**：
- message token 不立即产出，累积到 `cachedContent`，通过 `scheduleRafFlush` 在下一帧聚合产出，每帧最多触发一次重渲染
- 控制事件入队前先 `flushCache()`，保证正文内容先于控制信号产出
- 消费端用 `Promise notify` 唤醒，替代 RAF 轮询避免无谓的帧消耗

```typescript
// scheduleRafFlush：每帧最多 flush 一次
const scheduleRafFlush = () => {
  if (rafId !== null) return  // 已排期，直接返回
  rafId = requestAnimationFrame(() => {
    if (cachedContent) {
      onToken(cachedContent, false)
      cachedContent = ''
    }
    rafId = null
  })
}
```

## 安全防护

### rehypeRaw 插件

| 策略 | 实现 |
|------|------|
| 危险标签降级 | script/style/iframe/object/embed/title 等 → 纯文本 |
| URL 协议过滤 | 拦截 javascript:/data:/vbscript: |
| 危险属性剥离 | 移除 style/onclick/onerror/onload 等 |

### MarkdownErrorBoundary

- react-markdown 抛错 → 降级为 `whitespace-pre-wrap` 纯文本
- 流式期间冻结 resetKey，避免逐 token 重试→报错抖动

---

## SSE 格式规范

```
id:<conversationId>
event:dialogId
data:{"content":"<conversationId>"}

id:<conversationId>
event:message
data:{"type":"text","content":"token"}

id:<conversationId>
event:usage
data:{"promptTokens":...,"completionTokens":...,"totalTokens":...}

id:<conversationId>
event:finish
data:{"content":"[DONE]"}
```

---

## 服务端

### 系统提示词

`apps/server/src/chat/chat.service.ts` 自动注入：

```
输出 Markdown 时，请严格遵守：
1. 数学公式：行内用 $...$，块级用 $$...$$（独立成行）
2. 代码块：三个反引号围栏 + 标注语言
3. LaTeX：花括号必须成对
4. 标题：用 ## 或 ###
5. 列表/表格：标准 GFM 语法
```

### 跨 chunk 行缓冲

LLM 上游 SSE 行可能被 TCP 分片切割到两个相邻的 `read()` chunk 中，
直接 `value.split('\n')` 会导致被切断的行丢失。

**修复**：引入 `lineBuffer` 跨 chunk 保留未完整行：

```typescript
lineBuffer += value
const lines = lineBuffer.split('\n')
lineBuffer = lines.pop() ?? ''  // 最后一段可能不完整，留到下次 chunk 拼接

for (const line of lines) {
  processLine(line.trimEnd())
  // ...
}
```

同时增加 token 合批缓冲（50 字符 / 40ms 阈值）。

### 模型列表

| 模型 | 说明 |
|------|------|
| `deepseek-v4-pro` | 旗舰对话模型（默认） |
| `deepseek-v4-flash` | 快速轻量模型 |

---

## 构建配置

### rspack.config.mjs

CSS 规则必须使用 `style-loader` → `css-loader` → `postcss-loader` 链：

```js
{
  test: /\.css$/,
  use: ['style-loader', 'css-loader', 'postcss-loader'],
  type: 'javascript/auto',
}
```

rspack 原生 `type: 'css'` 会先于 PostCSS 解析 `@apply`，导致 `Unknown at rule @apply` 错误。

### tailwind.config.js

引入 `@tailwindcss/typography` 插件以支持 `prose` 类名。

---

## 消息渲染逻辑

```tsx
// Chat/index.tsx
{msg.role === 'user' ? (
  <div className="... bg-primary">{msg.content}</div>  // 纯文本
) : (
  <div className="... bg-muted">
    <Markdown
      content={msg.content}
      isTyping={streaming}
      blockMode={streaming}  // 流式中启用分块
    />
  </div>
)}
```
