import 'katex/dist/katex.min.css'
import './index.css'

import { Component, memo, useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkHtml from 'remark-html'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import { cn, createLogger } from '@yes/shared'

import CodeBlock from './CodeBlock'
import { preprocessContent } from './utils/katex'
import rehypeRaw from './utils/rehypeRaw'
import { splitMarkdownIntoBlocks } from './utils/splitBlocks'

export interface MarkdownProps {
  /** 外部样式类名 */
  className?: string
  /** Markdown 原始内容 */
  content: string
  /** 是否正在流式输出 */
  isTyping?: boolean
  /**
   * 是否启用分块记忆化渲染。
   *
   * 开启后按安全空行将 content 切分为多个 block，
   * 已完成 block memo 冻结，仅尾块随流式更新重新解析，
   * 将全量重解析 O(N²) 降为增量解析 O(N)。
   */
  blockMode?: boolean
}

// ── 错误边界 ──

interface ErrorBoundaryState {
  hasError: boolean
  frozenResetKey: string | null
}

/**
 * Markdown 渲染错误边界。
 *
 * react-markdown 在部分机型/浏览器上可能抛错。
 * 此处做"报错→纯文本"降级；流式期间冻结 resetKey 避免抖动。
 */
class MarkdownErrorBoundary extends Component<
  { children: React.ReactNode; resetKey: string; isTyping: boolean },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false, frozenResetKey: null }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true, frozenResetKey: null }
  }

  componentDidUpdate(prevProps: { resetKey: string; isTyping: boolean }) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      if (!this.props.isTyping) {
        this.setState({ hasError: false, frozenResetKey: null })
      }
    }
  }

  componentDidCatch(error: Error) {
    createLogger('chat:markdown').warn('Markdown render error:', error.message)
    if (this.props.isTyping) {
      this.setState({ frozenResetKey: this.props.resetKey })
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="select-text whitespace-pre-wrap break-words text-sm">
          {this.props.children}
        </div>
      )
    }
    return this.props.children
  }
}

/** 生成内容唯一标识 key，用于错误边界重置判断 */
const getContentKey = (text: string) => `${text.length}:${text.slice(0, 128)}`

/**
 * Markdown 渲染组件。
 *
 * 支持：
 * - GFM（表格/任务列表/删除线）
 * - 数学公式（KaTeX，含 \(/\)、\[/\]、\begin{equation} 定界符兼容）
 * - 内嵌原始 HTML（安全过滤：危险标签降级为纯文本）
 * - 代码块语法高亮（Shiki，流式中禁用，行号展示）
 * - 渲染错误→纯文本降级
 * - blockMode 分块渲染（O(N²) → O(N)）
 */
const Markdown = memo(
  ({ className, content, isTyping = false, blockMode = false }: MarkdownProps) => {
    const processedContent = preprocessContent(content, isTyping)

    // 分块模式：按安全空行切分
    const blocks = useMemo(
      () => (blockMode ? splitMarkdownIntoBlocks(processedContent) : [processedContent]),
      [blockMode, processedContent],
    )

    const contentKey = getContentKey(processedContent)

    if (blockMode) {
      // 分块模式：已完成 block memo 冻结，仅尾块随流式更新
      return (
        <MarkdownErrorBoundary resetKey={contentKey} isTyping={isTyping}>
          <div className={cn('markdown-prose select-text', className)}>
            {blocks.slice(0, -1).map((block, i) => (
              <MarkdownCoreMemo
                key={`block-${i}-frozen`}
                content={block}
                isTyping={false}
              />
            ))}
            {blocks.length > 0 && (
              <MarkdownCoreMemo
                key="block-tail"
                content={blocks[blocks.length - 1]}
                isTyping={isTyping}
              />
            )}
          </div>
        </MarkdownErrorBoundary>
      )
    }

    // 默认模式：整块渲染
    return (
      <MarkdownErrorBoundary resetKey={contentKey} isTyping={isTyping}>
        <div className={cn('markdown-prose select-text', className)}>
          <MarkdownCoreMemo content={processedContent} isTyping={isTyping} />
        </div>
      </MarkdownErrorBoundary>
    )
  },
  (prev, next) =>
    prev.content === next.content &&
    prev.isTyping === next.isTyping &&
    prev.className === next.className &&
    prev.blockMode === next.blockMode,
)

Markdown.displayName = 'Markdown'

// ── MarkdownCore（内部 memo 子组件） ──

interface MarkdownCoreProps {
  content: string
  isTyping: boolean
}

/**
 * 单块 Markdown 渲染器（内部使用）。
 *
 * 封装完整的 ReactMarkdown 渲染逻辑。
 * memo 包裹：blockMode 下各 block 的 props 不变时跳过重渲染。
 */
const MarkdownCore = memo(
  ({ content, isTyping }: MarkdownCoreProps) => {
    /** 代码渲染组件 */
    const codeComponent = useMemo(
      () =>
        ({
          className: cls,
          children,
        }: React.ComponentPropsWithoutRef<'code'>) => {
          const match = /language-(\w+)/.exec(cls || '')
          const text = String(children ?? '')

          if (!match && !text.includes('\n')) {
            return <code className="codespan">{children}</code>
          }

          return (
            <CodeBlock
              code={text.replace(/\n$/, '')}
              language={match ? match[1] : 'text'}
              isTyping={isTyping}
            />
          )
        },
      [isTyping],
    )

    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath, remarkHtml]}
        // rehypeRaw 必须在 rehypeKatex 之前：先解析原始 HTML 生成完整 hast 节点，
        // rehypeKatex 才能正确识别其中的数学公式
        rehypePlugins={[rehypeRaw, rehypeKatex]}
        components={{ code: codeComponent }}
      >
        {content}
      </ReactMarkdown>
    )
  },
  (prev, next) =>
    prev.content === next.content && prev.isTyping === next.isTyping,
)

MarkdownCore.displayName = 'MarkdownCore'

/** 稳定引用版本，供 blockMode 外部引用 */
const MarkdownCoreMemo = MarkdownCore

export default Markdown
