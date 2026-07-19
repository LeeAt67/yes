import * as React from 'react'
import { AudioLines, Plus } from 'lucide-react'
import { IconButton } from '@yes/ui'
import { SendButton } from './SendButton'
import { VoiceButton } from './VoiceButton'
import { AttachButton } from './AttachButton'
import { ModelSelector } from './ModelSelector'

/**
 * InputToolbar — 底部工具栏。
 *
 * 组装 AttachButton + ModelSelector + VoiceButton + SendButton。
 */
export interface InputToolbarProps {
  // 模型选择
  model: string
  models: readonly string[]
  onModelSelect: (model: string) => void
  // 语音
  recording: boolean
  onVoiceToggle: () => void
  // 发送
  canSend: boolean
  loading: boolean
  onSend: () => void
  /** 停止生成 */
  onStop?: () => void
  // 附件
  onAttach: () => void
  // 设置（已移除，保留类型兼容可选）
  onSettings?: () => void
}

const InputToolbar: React.FC<InputToolbarProps> = ({
  model,
  models,
  onModelSelect,
  recording,
  onVoiceToggle,
  canSend,
  loading,
  onSend,
  onStop,
  onAttach,
  onSettings,
}) => {
  return (
    <div className="flex items-center justify-between px-2 py-1">
      {/* 左侧：Plus 附件按钮 + 模型选择 */}
      <div className="flex items-center gap-1">
        <IconButton label="添加附件" onClick={onAttach}>
          <Plus className="h-4 w-4" />
        </IconButton>
        <ModelSelector value={model} options={models} onSelect={onModelSelect} />
      </div>

      {/* 右侧：音频 + 语音 + 发送 */}
      <div className="flex items-center gap-1">
        <IconButton label="音频可用" onClick={() => {}}>
          <AudioLines className="h-4 w-4" />
        </IconButton>
        <VoiceButton recording={recording} onToggle={onVoiceToggle} />
        <SendButton canSend={canSend} loading={loading} onSend={onSend} onStop={onStop} />
      </div>
    </div>
  )
}
InputToolbar.displayName = 'InputToolbar'

export { InputToolbar }
