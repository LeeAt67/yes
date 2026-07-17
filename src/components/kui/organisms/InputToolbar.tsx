import * as React from 'react'
import { AudioLines, Plus } from 'lucide-react'
import { IconButton } from '@/components/kui/atoms/IconButton'
import { SendButton } from '@/components/kui/molecules/SendButton'
import { VoiceButton } from '@/components/kui/molecules/VoiceButton'
import { AttachButton } from '@/components/kui/molecules/AttachButton'
import { ModelSelector } from '@/components/kui/molecules/ModelSelector'

/**
 * InputToolbar — 底部工具栏（有机体）
 *
 * 组装：AttachButton + ModelSelector + (VoiceButton + SettingsButton + SendButton)
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
  onAttach,
  onSettings,
}) => {
  return (
    <div className="flex items-center justify-between border-t px-2 py-1">
      {/* 左侧：Plus 附件按钮 + 模型选择 */}
      <div className="flex items-center gap-1">
        <IconButton label="添加附件" onClick={onAttach}>
          <Plus className="h-4 w-4" />
        </IconButton>
        <ModelSelector value={model} options={models} onSelect={onModelSelect} />
      </div>

      {/* 右侧：音频指示 + 语音 + 发送 */}
      <div className="flex items-center gap-1">
        <IconButton label="音频可用" onClick={() => {}}>
          <AudioLines className="h-4 w-4" />
        </IconButton>
        <VoiceButton recording={recording} onToggle={onVoiceToggle} />
        <SendButton canSend={canSend} loading={loading} onSend={onSend} />
      </div>
    </div>
  )
}
InputToolbar.displayName = 'KuiInputToolbar'

export { InputToolbar }
