import { useState } from 'react'
import { cn } from '@yes/shared'
import { ChatInput } from '@/pages/Chat/components/ChatInput'
import { Button } from '@yes/ui'
import { IconButton } from '@yes/ui'
import { ArrowUp, Paperclip, Mic, Settings, ChevronDown } from 'lucide-react'

/**
 * 预览条目状态：
 * - `incubating`：孵化中，毕业后移入正式目录
 * - `graduated`：已毕业，已在使用
 */
type PreviewStatus = 'incubating' | 'graduated'

interface PreviewEntry {
  name: string
  desc: string
  status: PreviewStatus
  Demo: React.FC
}

const STATUS_CLASS: Record<PreviewStatus, string> = {
  incubating: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  graduated: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
}

const STATUS_LABEL: Record<PreviewStatus, string> = {
  incubating: '孵化中',
  graduated: '已毕业',
}

// ====== Demo Components ======

function ChatInputDemo() {
  const [value, setValue] = useState('')
  return (
    <ChatInput
      value={value}
      onValueChange={setValue}
      onSend={() => { alert(`发送: ${value}`); setValue('') }}
      placeholder="输入您的问题，Enter 发送"
    />
  )
}

function PromptTextareaDemo() {
  const [text, setText] = useState('')
  return (
    <textarea
      value={text}
      onChange={e => setText(e.target.value)}
      placeholder="输入文字试试自动撑高..."
      rows={1}
      className="w-full max-w-md resize-none rounded-xl border bg-transparent px-3 py-2 text-sm leading-6 focus:outline-none"
    />
  )
}

function ModelSelectorDemo() {
  return (
    <div className="flex items-center gap-2">
      <Button variant="toolbar" size="sm" className="gap-1">
        <span className="text-xs">Sonnet 5 Medium</span>
        <ChevronDown className="h-3 w-3" />
      </Button>
      <span className="text-xs text-muted-foreground">← 点击展开下拉</span>
    </div>
  )
}

function SendButtonDemo() {
  return (
    <div className="flex items-center gap-6">
      <div className="flex flex-col items-center gap-1">
        <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center">
          <ArrowUp className="h-4 w-4 text-muted-foreground/40" />
        </div>
        <span className="text-[10px] text-muted-foreground">无内容</span>
      </div>
      <div className="flex flex-col items-center gap-1">
        <Button variant="primaryCircle" size="iconMd">
          <ArrowUp className="h-4 w-4" />
        </Button>
        <span className="text-[10px] text-muted-foreground">可发送</span>
      </div>
    </div>
  )
}

function VoiceButtonDemo() {
  return (
    <div className="flex items-center gap-3">
      <IconButton label="未录音"><Mic className="h-4 w-4" /></IconButton>
      <IconButton label="录音中"><Mic className="h-4 w-4 text-destructive" /></IconButton>
      <span className="text-xs text-muted-foreground">普通 / 录音中</span>
    </div>
  )
}

function AttachButtonDemo() {
  return <IconButton label="添加附件"><Paperclip className="h-4 w-4" /></IconButton>
}

function ButtonDemo() {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col items-center gap-1">
        <Button variant="toolbar" size="sm">toolbar</Button>
        <span className="text-[10px] text-muted-foreground">toolbar sm</span>
      </div>
      <div className="flex flex-col items-center gap-1">
        <Button variant="primaryCircle" size="iconMd"><ArrowUp className="h-4 w-4" /></Button>
        <span className="text-[10px] text-muted-foreground">primaryCircle</span>
      </div>
      <div className="flex flex-col items-center gap-1">
        <Button variant="default">default</Button>
        <span className="text-[10px] text-muted-foreground">default</span>
      </div>
      <div className="flex flex-col items-center gap-1">
        <Button variant="outline">outline</Button>
        <span className="text-[10px] text-muted-foreground">outline</span>
      </div>
      <div className="flex flex-col items-center gap-1">
        <Button variant="ghost">ghost</Button>
        <span className="text-[10px] text-muted-foreground">ghost</span>
      </div>
      <div className="flex flex-col items-center gap-1">
        <Button variant="secondary">secondary</Button>
        <span className="text-[10px] text-muted-foreground">secondary</span>
      </div>
    </div>
  )
}

function InputToolbarDemo() {
  return (
    <div className="rounded-xl border max-w-md">
      <div className="flex items-center justify-between px-2 py-1">
        <div className="flex items-center gap-1">
          <IconButton label="附件"><Paperclip className="h-4 w-4" /></IconButton>
          <Button variant="toolbar" size="sm" className="gap-1">
            <span className="text-xs">Sonnet 5 Medium</span>
            <ChevronDown className="h-3 w-3" />
          </Button>
        </div>
        <div className="flex items-center gap-1">
          <IconButton label="设置"><Settings className="h-4 w-4" /></IconButton>
          <IconButton label="麦克风"><Mic className="h-4 w-4" /></IconButton>
          <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center">
            <ArrowUp className="h-4 w-4 text-muted-foreground/40" />
          </div>
        </div>
      </div>
    </div>
  )
}

// ====== 组件列表 ======

const entries: PreviewEntry[] = [
  { name: 'ChatInput',       desc: 'Claude 风格完整输入框',              status: 'graduated', Demo: ChatInputDemo },
  { name: 'PromptTextarea',  desc: '自动撑高文本域',                      status: 'graduated', Demo: PromptTextareaDemo },
  { name: 'InputToolbar',    desc: '底部工具栏',                          status: 'graduated', Demo: InputToolbarDemo },
  { name: 'SendButton',      desc: '发送按钮（三态切换）',                status: 'graduated', Demo: SendButtonDemo },
  { name: 'VoiceButton',     desc: '语音按钮',                            status: 'graduated', Demo: VoiceButtonDemo },
  { name: 'AttachButton',    desc: '附件按钮',                            status: 'graduated', Demo: AttachButtonDemo },
  { name: 'ModelSelector',   desc: '模型下拉选择',                        status: 'graduated', Demo: ModelSelectorDemo },
  { name: 'Button',          desc: '基础按钮（6 种变体）',                status: 'graduated', Demo: ButtonDemo },
]

// ====== 主页面 ======

export default function ComponentPreviewPage() {
  const [active, setActive] = useState<string>(entries[0].name)
  const currentEntry = entries.find(e => e.name === active)

  return (
    <div className="flex h-full overflow-hidden">
      {/* 左侧列表 */}
      <aside className="w-56 shrink-0 border-r bg-background overflow-y-auto">
        <div className="sticky top-0 z-10 bg-background border-b px-4 py-3">
          <h2 className="text-sm font-semibold">组件预览</h2>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {entries.length} 个组件 · 调试用
          </p>
        </div>

        <div className="px-2 py-2 space-y-0.5">
          {entries.map(({ name, desc, status }) => (
            <button
              key={name}
              onClick={() => setActive(name)}
              className={cn(
                'w-full flex flex-col items-start rounded-md px-3 py-2 text-left transition-colors',
                active === name
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/40',
              )}
            >
              <div className="flex items-center gap-2 w-full">
                <span className={cn('text-sm', active === name && 'font-medium')}>{name}</span>
                <span className={cn('ml-auto shrink-0 rounded px-1.5 py-0 text-[10px] font-medium', STATUS_CLASS[status])}>
                  {STATUS_LABEL[status]}
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground/70 mt-0.5 line-clamp-2">{desc}</span>
            </button>
          ))}
        </div>
      </aside>

      {/* 右侧预览 */}
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl px-8 py-8">
          {currentEntry && (
            <>
              <div className="mb-8 pb-6 border-b">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-lg font-bold">{currentEntry.name}</h2>
                  <span className={cn('rounded px-2 py-0.5 text-xs font-medium', STATUS_CLASS[currentEntry.status])}>
                    {STATUS_LABEL[currentEntry.status]}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{currentEntry.desc}</p>
              </div>

              <currentEntry.Demo />
            </>
          )}
        </div>
      </main>
    </div>
  )
}
