import { useState } from 'react'
import { Paperclip, Mic, Settings, ArrowUp, Send, ChevronDown, ChevronRight, Palette } from 'lucide-react'
import { ChatInput } from '@/components/kui'
import { Button } from '@/components/kui/atoms/Button'
import { IconButton } from '@/components/kui/atoms/IconButton'
import tokens from '@/lib/tokens'
import { cn } from '@/lib/utils'

// ====== 组件分类（Ant Design 风格） ======

type ComponentKey =
  | 'button' | 'iconbutton'
  | 'prompttextarea' | 'attachbutton' | 'modelselector' | 'voicebutton'
  | 'sendbutton'
  | 'inputtoolbar' | 'chatinput'
  | 'tokens'

interface Category {
  label: string
  children: { key: ComponentKey; label: string; desc: string }[]
}

const categories: Category[] = [
  {
    label: '通用',
    children: [
      { key: 'button',       label: 'Button',       desc: '基础按钮，6 种变体' },
      { key: 'iconbutton',   label: 'IconButton',   desc: '图标按钮，封装 Button' },
    ],
  },
  {
    label: '数据录入',
    children: [
      { key: 'prompttextarea', label: 'PromptTextarea', desc: '自动撑高文本域' },
      { key: 'attachbutton',   label: 'AttachButton',   desc: '附件上传按钮' },
      { key: 'modelselector',  label: 'ModelSelector',  desc: '模型下拉选择' },
      { key: 'voicebutton',    label: 'VoiceButton',    desc: '语音录制按钮' },
    ],
  },
  {
    label: '反馈',
    children: [
      { key: 'sendbutton', label: 'SendButton', desc: '发送按钮，三态切换' },
    ],
  },
  {
    label: '组合',
    children: [
      { key: 'inputtoolbar', label: 'InputToolbar', desc: '底部工具栏有机体' },
      { key: 'chatinput',    label: 'ChatInput',    desc: '完整输入框组件' },
    ],
  },
  {
    label: '设计体系',
    children: [
      { key: 'tokens', label: 'Tokens', desc: '色彩变量 & 语义色板' },
    ],
  },
]

/** 发送模拟 */
function sendMessage(text: string) {
  alert(`消息已发送: ${text}`)
}

// ====== 组件 Demo 区块 ======

function ButtonDemo() {
  return (
    <section>
      <h3 className="text-sm font-semibold mb-1">Button 按钮</h3>
      <p className="text-xs text-muted-foreground mb-4">
        从 shadcn/ui 扩展，新增 toolbar / primaryCircle 变体和 iconSm / iconMd 尺寸
      </p>
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
          <Button variant="default" size="default">default</Button>
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
    </section>
  )
}

function IconButtonDemo() {
  return (
    <section>
      <h3 className="text-sm font-semibold mb-1">IconButton 图标按钮</h3>
      <p className="text-xs text-muted-foreground mb-4">
        封装 KuiButton，默认 variant=toolbar + size=iconSm
      </p>
      <div className="flex items-center gap-3">
        <IconButton label="附件"><Paperclip className="h-4 w-4" /></IconButton>
        <IconButton label="设置"><Settings className="h-4 w-4" /></IconButton>
        <IconButton label="麦克风"><Mic className="h-4 w-4" /></IconButton>
        <IconButton label="发送" variant="primaryCircle" size="iconMd">
          <Send className="h-4 w-4" />
        </IconButton>
      </div>
    </section>
  )
}

function PromptTextareaDemo() {
  const [text, setText] = useState('')
  return (
    <section>
      <h3 className="text-sm font-semibold mb-1">PromptTextarea 文本域</h3>
      <p className="text-xs text-muted-foreground mb-4">
        自动撑高、Enter 发送、透明背景无边框
      </p>
      <div className="rounded-xl border p-2 max-w-md">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="输入文字试试自动撑高..."
          rows={1}
          className="w-full resize-none border-0 bg-transparent px-3 py-2 text-sm leading-6 placeholder:text-muted-foreground/60 focus:outline-none"
        />
      </div>
    </section>
  )
}

function ModelSelectorDemo() {
  const [model] = useState('Sonnet 5 Medium')
  return (
    <section>
      <h3 className="text-sm font-semibold mb-1">ModelSelector 模型选择器</h3>
      <p className="text-xs text-muted-foreground mb-4">
        紧凑下拉、点击外部关闭、选中态高亮
      </p>
      <div className="flex items-center gap-2">
        <Button variant="toolbar" size="sm" className="gap-1">
          <span className="text-xs text-muted-foreground">Model:</span>
          <span className="text-xs">{model}</span>
          <ChevronDown className="h-3 w-3" />
        </Button>
        <span className="text-xs text-muted-foreground">← 点击展开下拉</span>
      </div>
    </section>
  )
}

function SendButtonDemo() {
  return (
    <section>
      <h3 className="text-sm font-semibold mb-1">SendButton 发送按钮</h3>
      <p className="text-xs text-muted-foreground mb-4">
        有内容时亮色圆形，无内容时灰色禁用态
      </p>
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
    </section>
  )
}

function VoiceButtonDemo() {
  return (
    <section>
      <h3 className="text-sm font-semibold mb-1">VoiceButton 语音按钮</h3>
      <p className="text-xs text-muted-foreground mb-4">
        封装自 IconButton → KuiButton，录音中变色
      </p>
      <div className="flex items-center gap-3">
        <IconButton label="未录音"><Mic className="h-4 w-4" /></IconButton>
        <IconButton label="录音中"><Mic className="h-4 w-4 text-destructive" /></IconButton>
        <span className="text-xs text-muted-foreground">← 普通 / 录音中</span>
      </div>
    </section>
  )
}

function AttachButtonDemo() {
  return (
    <section>
      <h3 className="text-sm font-semibold mb-1">AttachButton 附件按钮</h3>
      <p className="text-xs text-muted-foreground mb-4">
        封装自 IconButton → KuiButton
      </p>
      <div className="flex items-center gap-3">
        <IconButton label="添加附件"><Paperclip className="h-4 w-4" /></IconButton>
        <span className="text-xs text-muted-foreground">← 点击可触发文件选择</span>
      </div>
    </section>
  )
}

function InputToolbarDemo() {
  return (
    <section>
      <h3 className="text-sm font-semibold mb-1">InputToolbar 底部工具栏</h3>
      <p className="text-xs text-muted-foreground mb-4">
        组装 AttachButton + ModelSelector + VoiceButton + SendButton
      </p>
      <div className="rounded-xl border max-w-md">
        <div className="flex items-center justify-between px-2 py-1">
          <div className="flex items-center gap-1">
            <IconButton label="附件"><Paperclip className="h-4 w-4" /></IconButton>
            <Button variant="toolbar" size="sm" className="gap-1">
              <span className="text-xs text-muted-foreground">Model:</span>
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
    </section>
  )
}

function TokensDemo() {
  const [dark, setDark] = useState(false)

  return (
    <section>
      <h3 className="text-sm font-semibold mb-1">Design Tokens</h3>
      <p className="text-xs text-muted-foreground mb-4">
        极简黑白体系。6 个核心语义 Token，扩展时追加。
      </p>

      {/* 主题切换 */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => setDark(false)}
          className={cn(
            'rounded-full px-3 py-1 text-xs border transition-colors',
            !dark ? 'bg-foreground text-background border-foreground' : 'border-border text-muted-foreground'
          )}
        >
          Light
        </button>
        <button
          onClick={() => setDark(true)}
          className={cn(
            'rounded-full px-3 py-1 text-xs border transition-colors',
            dark ? 'bg-foreground text-background border-foreground' : 'border-border text-muted-foreground'
          )}
        >
          Dark
        </button>
      </div>

      {/* Token 色板 */}
      <div className="grid gap-3 sm:grid-cols-2">
        {tokens.map((t) => {
          const color = dark ? t.dark : t.light
          return (
            <div
              key={t.cssVar}
              className="flex items-center gap-3 rounded-lg border p-3"
              style={{ background: dark ? '#1E1E1E' : '#FFFFFF' }}
            >
              {/* 色块 */}
              <div
                className="h-10 w-10 shrink-0 rounded-lg border shadow-sm"
                style={{ background: color }}
              />
              <div className="min-w-0">
                <div className="text-xs font-medium">{t.name}</div>
                <div className="text-[10px] text-muted-foreground truncate">
                  {t.cssVar}
                </div>
                <div className="text-[10px] font-mono text-muted-foreground/70">
                  {color}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

// ====== 主页面 ======

export default function ChatInputDemoPage() {
  const [activeKey, setActiveKey] = useState<ComponentKey>('chatinput')
  // 折叠分组
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  const toggleCategory = (label: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(label)) next.delete(label)
      else next.add(label)
      return next
    })
  }

  // ChatInput 状态
  const [inputValue, setInputValue] = useState('')

  const handleSend = () => {
    if (!inputValue.trim()) return
    sendMessage(inputValue)
    setInputValue('')
  }

  const sectionRefs: Record<ComponentKey, React.ReactNode> = {
    button: <ButtonDemo />,
    iconbutton: <IconButtonDemo />,
    prompttextarea: <PromptTextareaDemo />,
    modelselector: <ModelSelectorDemo />,
    sendbutton: <SendButtonDemo />,
    voicebutton: <VoiceButtonDemo />,
    attachbutton: <AttachButtonDemo />,
    inputtoolbar: <InputToolbarDemo />,
    tokens: <TokensDemo />,
    chatinput: (
      <section>
        <h3 className="text-sm font-semibold mb-1">ChatInput 输入框</h3>
        <p className="text-xs text-muted-foreground mb-4">
          所有原子/分子/有机体组装的最终产物。输入文字后按 Enter 发送。
        </p>
        <ChatInput
          value={inputValue}
          onValueChange={setInputValue}
          onSend={handleSend}
          placeholder="输入您的问题，Enter 发送，Shift+Enter 换行"
        />
      </section>
    ),
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* ===== 左侧导航 (Ant Design 风格) ===== */}
      <aside className="w-56 shrink-0 border-r bg-background overflow-y-auto">
        {/* 顶部标题 */}
        <div className="sticky top-0 z-10 bg-background border-b px-4 py-3">
          <h2 className="text-sm font-semibold">组件导航</h2>
          <p className="text-[10px] text-muted-foreground mt-0.5">KUI · 共 {categories.reduce((s, c) => s + c.children.length, 0)} 个组件</p>
        </div>

        {/* 分类列表 */}
        <div className="px-2 py-2">
          {categories.map(({ label, children }) => {
            const isOpen = !collapsed.has(label)
            return (
              <div key={label} className="mb-1">
                {/* 分类标题 */}
                <button
                  onClick={() => toggleCategory(label)}
                  className="w-full flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ChevronRight
                    className={`h-3 w-3 shrink-0 transition-transform ${isOpen ? 'rotate-90' : ''}`}
                  />
                  {label}
                </button>

                {/* 子项 */}
                {isOpen && (
                  <div className="ml-2 space-y-0.5">
                    {children.map(({ key, label: itemLabel, desc }) => (
                      <button
                        key={key}
                        onClick={() => setActiveKey(key)}
                        className={`w-full flex flex-col items-start rounded-md px-3 py-1.5 text-left transition-colors ${
                          activeKey === key
                            ? 'bg-accent text-accent-foreground'
                            : 'text-muted-foreground hover:text-foreground hover:bg-accent/40'
                        }`}
                      >
                        <span className={`text-sm ${activeKey === key ? 'font-medium' : ''}`}>
                          {itemLabel}
                        </span>
                        <span className="text-[10px] text-muted-foreground/70 truncate w-full">
                          {desc}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </aside>

      {/* ===== 右侧内容 ===== */}
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl px-8 py-8">
          {/* 标题栏 */}
          <div className="mb-8 pb-6 border-b">
            <h2 className="text-lg font-bold mb-1">
              {categories.flatMap(c => c.children).find(c => c.key === activeKey)?.label ?? 'ChatInput'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {categories.flatMap(c => c.children).find(c => c.key === activeKey)?.desc ?? ''}
            </p>
          </div>

          {/* 组件 Demo */}
          {sectionRefs[activeKey]}
        </div>
      </main>
    </div>
  )
}
