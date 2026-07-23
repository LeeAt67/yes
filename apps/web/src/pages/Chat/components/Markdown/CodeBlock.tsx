import { Component, Suspense, lazy, useState, useCallback, Fragment, useMemo } from 'react'
import DOMPurify from 'dompurify'
import { createLogger } from '@yes/shared'

import useInViewOnce from './hooks/useInViewOnce'

const logger = createLogger('chat:code-block')

/** Shiki 高亮器懒加载 */
const SafeShikiHighlighter = lazy(() => import('react-shiki'))

export interface CodeBlockProps {
  code: string
  language: string
  isTyping?: boolean
}

// ── 三层降级检测 ──

/** 检测浏览器是否支持 RegExp lookbehind */
const supportsLookbehind = (() => {
  try {
    new RegExp('(?<=.)')
    return true
  } catch {
    return false
  }
})()

// ── 错误边界 ──

interface ShikiErrorBoundaryState {
  hasError: boolean
}

class ShikiErrorBoundary extends Component<
  { fallback: React.ReactNode; children: React.ReactNode },
  ShikiErrorBoundaryState
> {
  state: ShikiErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ShikiErrorBoundaryState {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) return this.props.fallback
    return this.props.children
  }
}

// ── PlainLines（纯文本占位，与 Shiki 同 DOM 结构） ──

const PlainLines = ({
  className,
  code,
}: {
  className?: string
  code: string
}) => {
  const lines = code.split('\n')
  return (
    <pre className={className}>
      <code>
        {lines.map((line, idx) => (
          <Fragment key={idx}>
            <span className="line">{line}</span>
            {idx === lines.length - 1 ? '' : '\n'}
          </Fragment>
        ))}
      </code>
    </pre>
  )
}

// ── CodeBlock 主组件 ──

/**
 * 代码块渲染组件，三层降级 + 可视区优先高亮。
 *
 * 降级链：
 *   1. 浏览器不支持 RegExp lookbehind → 纯文本 PlainLines
 *   2. React.lazy 加载 react-shiki 失败 → 纯文本 PlainLines
 *   3. ShikiErrorBoundary 渲染报错 → 纯文本 PlainLines
 *
 * 可视区优先：仅代码块进入视口（含 300px 提前量）才触发 shiki 高亮。
 */
const CodeBlock = ({ code, language, isTyping = false }: CodeBlockProps) => {
  const [copyLabel, setCopyLabel] = useState('复制')
  const isHtml = language === 'html'

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopyLabel('已复制')
      setTimeout(() => setCopyLabel('复制'), 2000)
    } catch (err) {
      logger.error('复制代码失败:', err)
    }
  }, [code])

  const [inViewRef, inView] = useInViewOnce<HTMLDivElement>()
  const [htmlView, setHtmlView] = useState<'code' | 'preview'>('code')

  const preClassName = 'overflow-x-auto rounded-b-lg text-xs [&_pre]:rounded-b-lg [&_pre]:text-xs'

  const fallbackPre = useMemo(
    () => <PlainLines className={preClassName} code={code} />,
    [code],
  )

  // 不支持 lookbehind → 直接降级纯文本
  if (!supportsLookbehind) {
    return (
      <div className="group relative my-2">
        <div className="flex items-center justify-between rounded-t-lg bg-muted px-3 py-1.5 text-xs text-muted-foreground">
          <span>{language}</span>
        </div>
        {fallbackPre}
      </div>
    )
  }

  // 流式中 → 纯文本，保留框架结构
  if (isTyping) {
    return (
      <div className="group relative my-2">
        <div className="flex items-center justify-between rounded-t-lg bg-muted px-3 py-1.5 text-xs text-muted-foreground">
          <span>{language}</span>
        </div>
        <div className="rounded-b-lg border border-t-0 border-border">
          <PlainLines className={preClassName} code={code} />
        </div>
      </div>
    )
  }

  return (
    <div ref={inViewRef} className="group relative my-2">
      {/* Sticky header */}
      <div className="sticky top-0 z-[10] bg-background">
        <div className="flex items-center justify-between rounded-t-lg border border-b-0 border-border bg-muted px-3 py-1.5 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>{language}</span>
            {isHtml && (
              <div className="flex rounded border border-border text-[11px]">
                <button
                  onClick={() => setHtmlView('code')}
                  className={`px-2 py-0.5 ${htmlView === 'code' ? 'bg-background text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  代码
                </button>
                <button
                  onClick={() => setHtmlView('preview')}
                  className={`px-2 py-0.5 ${htmlView === 'preview' ? 'bg-background text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  预览
                </button>
              </div>
            )}
          </div>
          <button
            onClick={handleCopy}
            className="opacity-0 transition-opacity group-hover:opacity-100 hover:text-foreground"
          >
            {copyLabel}
          </button>
        </div>
      </div>

      {/* 代码主体 */}
      {isHtml && htmlView === 'preview' ? (
        <div
          className="max-w-full overflow-hidden rounded-b-lg border border-t-0 border-border p-2"
          // eslint-disable-next-line react/no-danger -- DOMPurify 净化后的 HTML 内容
          dangerouslySetInnerHTML={{
            __html: DOMPurify.sanitize(code, {
              FORBID_ATTR: ['style'],
              ADD_ATTR: ['target'],
            }),
          }}
        />
      ) : (
      <div className="relative overflow-hidden rounded-b-lg border border-t-0 border-border">
        {/* 底层占位（仅在高亮未挂载时可见） */}
        {!inView && <div aria-hidden>{fallbackPre}</div>}
        {/* 上层高亮：挂载后设 bg-background 覆盖底层 */}
        <div className="bg-background">
          {inView ? (
            <ShikiErrorBoundary fallback={fallbackPre}>
              <Suspense fallback={fallbackPre}>
                <SafeShikiHighlighter
                  language={language}
                  theme="github-light"
                  className={preClassName}
                >
                  {code}
                </SafeShikiHighlighter>
              </Suspense>
            </ShikiErrorBoundary>
          ) : (
            fallbackPre
          )}
        </div>
      </div>
      )}
    </div>
  )
}

export default CodeBlock
