import * as React from 'react'
import { Mic, MicOff } from 'lucide-react'
import { IconButton } from '@/components/IconButton'

/**
 * VoiceButton — 语音录制按钮
 *
 * 封装自 IconButton → Button
 */
export interface VoiceButtonProps {
  /** 是否正在录音 */
  recording: boolean
  /** 切换录音 */
  onToggle: () => void
  /** 是否禁用 */
  disabled?: boolean
}

const VoiceButton: React.FC<VoiceButtonProps> = ({
  recording,
  onToggle,
  disabled = false,
}) => {
  return (
    <IconButton
      label={recording ? '停止录音' : '开始录音'}
      onClick={onToggle}
      disabled={disabled}
    >
      {recording ? (
        <MicOff className="h-4 w-4 text-destructive" />
      ) : (
        <Mic className="h-4 w-4" />
      )}
    </IconButton>
  )
}
VoiceButton.displayName = 'VoiceButton'

export { VoiceButton }
