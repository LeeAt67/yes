import React, { forwardRef, useState, useEffect, useRef, useCallback } from 'react'
import { runInAction } from 'mobx'
import { cn, createLogger } from '@yes/shared'
import { observer } from 'mobx-react-lite'
import { Search, ChevronRight } from 'lucide-react'
import { ChatInput } from './components/ChatInput'
import Welcome from './components/Welcome'
import Markdown from './components/Markdown'
import SearchResultPanel from './components/SearchResultPanel'
import ToolRenderer from '@/components/ToolRenderer'
import { streamChatMessage, type WebSearchResult } from '@/service/chat'
import { setApiToken, api } from '@/service/api'
import { conversationStore, authStore, toolStore } from '@/controller/instances'

const logger = createLogger('chat:page')

/** localStorage 草稿 key：防止发送途中 401 导致输入内容丢失 */
const DRAFT_KEY = 'chat-draft'

const DEFAULT_MODELS = ['deepseek-v4-pro', 'deepseek-v4-flash']

interface ChatPageClassNames {
  root?: string
  input?: string
}

export interface ChatPageProps {
  className?: string
  classNames?: ChatPageClassNames
}

/**
 * Chat 对话页面 — 问候语 + ChatInput 输入框 + 消息列表。
 *
 * 流式消息通过 conversationStore.appendToken 实时输出。
 */
const ChatPage = forwardRef<HTMLDivElement, ChatPageProps>(
  ({ className, classNames }, ref) => {
    const [inputValue, setInputValue] = useState(() => localStorage.getItem(DRAFT_KEY) ?? '')
    const [model, setModel] = useState('deepseek-v4-pro')
    const [models, setModels] = useState<string[]>(DEFAULT_MODELS)
    const [searchPanelOpen, setSearchPanelOpen] = useState(false)
    const { messages, streaming, activeId } = conversationStore
    const abortRef = useRef<AbortController | null>(null)

    // 从 toolStore 聚合所有已完成的搜索调用，去重（按 URL）后用于浮动面板
    const webSearchResults: WebSearchResult[] = React.useMemo(() => {
      const seen = new Set<string>()
      const all: WebSearchResult[] = []
      for (const call of toolStore.calls) {
        if (call.toolName !== 'web_search' || call.status !== 'completed') continue
        let items: unknown[] = []
        const d = call.result?.data
        if (Array.isArray(d)) items = d
        else if (typeof d === 'string') {
          try { items = JSON.parse(d) } catch { /* skip */ }
        }
        for (const item of items) {
          const r = item as WebSearchResult
          if (r.url && seen.has(r.url)) continue
          if (r.url) seen.add(r.url)
          all.push(r)
        }
      }
      return all
    }, [toolStore.calls])

    // 本轮是否发起过任何工具调用（避免 tool_call 间隙闪现"思考中…"）
    const hasToolActivity = toolStore.calls.length > 0

    // 从后端拉取模型列表
    useEffect(() => {
      api.get<Array<{ id: string }>>('/api/models').then(([data]) => {
        if (data && data.length > 0) setModels(data.map((m) => m.id))
      })
    }, [])

    // 页面挂载时从服务端加载会话列表
    useEffect(() => {
      if (authStore.accessToken) {
        setApiToken(authStore.accessToken)
        conversationStore.loadConversationList()
      }
    }, [authStore.accessToken])

    /** 发送消息 — 调用流式 API，token 实时追加到 store */
    const handleSend = useCallback(async () => {
      const query = inputValue.trim()
      if (!query || streaming || !activeId) return

      logger.info('Sending:', { query, model })

      // 持久化草稿：防止发送途中 401 导致输入内容丢失
      localStorage.setItem(DRAFT_KEY, inputValue)
      setInputValue('')

      // 同步 auth token
      setApiToken(authStore.accessToken)

      // 创建 AbortController，用于取消
      const controller = new AbortController()
      abortRef.current = controller

      // 重置工具调用
      toolStore.reset()

      // 提取当前对话历史（不含即将发送的用户消息和 AI 占位）
      const history = conversationStore.messages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }))

      // 用户消息先入 store
      conversationStore.addMessage({ role: 'user', content: query })
      // AI 占位消息（流式追加）
      conversationStore.addMessage({ role: 'assistant', content: '' })
      runInAction(() => { conversationStore.streaming = true })

      const messages = await streamChatMessage(query, (token) => {
        conversationStore.appendToken(token)
      }, {
        conversationId: activeId!,
        modelConfig: {
          model,
          webSearchStatus: 'enabled',
        },
        signal: controller.signal,
        onToolCall: (name, args) => {
          runInAction(() => { toolStore.addCall(name, args) })
        },
        onToolProgress: (name, message) => {
          runInAction(() => { toolStore.setProgress(name, message) })
        },
        onToolResult: (name, result) => {
          runInAction(() => {
            const calls = toolStore.calls
            let idx = -1
            for (let i = calls.length - 1; i >= 0; i--) {
              if (calls[i].toolName === name && calls[i].status === 'running') {
                idx = i
                break
              }
            }
            if (idx >= 0) {
              toolStore.completeCall(idx, { data: result })
            }
          })
        },
        history,
      })

      // 请求完毕后清理
      abortRef.current = null
      runInAction(() => { conversationStore.streaming = false })

      // 发送成功 → 清除草稿
      if (messages.length > 0) {
        localStorage.removeItem(DRAFT_KEY)
      } else {
        // 发送失败（通常是 401）：回滚已添加的消息 + 恢复输入框
        // removeLastMessages(2) 移除 user + assistant 占位
        conversationStore.removeLastMessages(2)
        setInputValue(query)
      }
    }, [inputValue, streaming, model, activeId])

    /** 停止生成 — 中断当前流式请求 */
    const handleStop = useCallback(() => {
      if (abortRef.current) {
        abortRef.current.abort()
        abortRef.current = null
      }
    }, [])

    return (
      <div
        ref={ref}
        className={cn(
          'flex h-full flex-col',
          classNames?.root,
          className,
        )}
      >
        {/* 消息列表（有消息时滚动显示） */}
        {messages.length > 0 ? (
          <div className="relative flex-1 overflow-y-auto px-4 py-6">
            <div className="mx-auto max-w-2xl space-y-6">
              {messages.map((msg, i) => {
                const isLast = i === messages.length - 1
                const isAssistant = msg.role === 'assistant'

                // 该条 AI 消息对应的已完成搜索调用（同一轮中）
                const hasSearchResults = isLast && webSearchResults.length > 0

                return (
                  <div
                    key={msg.id}
                    className="flex flex-col gap-1.5"
                  >
                    {/* 用户消息 */}
                    {msg.role === 'user' && (
                      <div className="flex justify-end">
                        <div className="max-w-[80%] rounded-xl bg-primary px-4 py-3 text-sm leading-6 text-primary-foreground">
                          {msg.content}
                        </div>
                      </div>
                    )}

                    {/* 工具调用动态效果：替换"思考中…"，保持在助手消息上方 */}
                    {isLast && isAssistant && hasToolActivity && !msg.content && (
                      <div className="flex justify-start">
                        <div className="max-w-[85%] rounded-xl bg-muted px-4 py-3">
                          {toolStore.calls.map(call => (
                            <ToolRenderer
                              key={`${call.toolName}-${call.startedAt}`}
                              state={call}
                              className="mb-1 last:mb-0"
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* AI 回答 */}
                    {isAssistant && (
                      <div className="flex justify-start">
                        <div className="max-w-[80%] rounded-xl bg-muted px-4 py-3 text-sm leading-6 text-foreground">
                          {msg.content ? (
                            <Markdown
                              content={msg.content}
                              isTyping={streaming && isLast}
                              blockMode
                            />
                          ) : streaming && !hasToolActivity ? (
                            <span className="italic text-muted-foreground">思考中…</span>
                          ) : null}
                        </div>
                      </div>
                    )}

                    {/* 搜索结果汇总按钮（AI 回答下方） */}
                    {hasSearchResults && (
                      <div className="flex justify-start">
                        <button
                          type="button"
                          onClick={() => setSearchPanelOpen(true)}
                          className="flex items-center gap-1.5 rounded-lg bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        >
                          <Search className="h-3 w-3" />
                          <span>找到 {webSearchResults.length} 条搜索结果</span>
                          <ChevronRight className="ml-0.5 h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* 悬浮搜索结果面板 */}
            <SearchResultPanel
              results={webSearchResults}
              open={searchPanelOpen}
              onClose={() => setSearchPanelOpen(false)}
            />
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center px-4">
            <Welcome />
          </div>
        )}

        {/* 输入框 */}
        <div
          className={cn(
            'px-4 pb-6',
            messages.length === 0 ? '' : 'pt-4',
          )}
        >
          <div className={cn('mx-auto max-w-xl', classNames?.input)}>
            <ChatInput
              value={inputValue}
              onValueChange={setInputValue}
              onSend={handleSend}
              onStop={handleStop}
              loading={streaming}
              placeholder="输入您的问题，Enter 发送，Shift+Enter 换行"
              model={model}
              models={models}
              onModelSelect={setModel}
            />
          </div>
        </div>
      </div>
    )
  },
)

ChatPage.displayName = 'ChatPage'
export default observer(ChatPage)
