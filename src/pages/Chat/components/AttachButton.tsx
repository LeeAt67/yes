import * as React from 'react'
import { Paperclip } from 'lucide-react'
import { IconButton } from '@/components/IconButton'

/**
 * AttachButton — 附件上传按钮
 *
 * 封装自 IconButton → Button
 */
export interface AttachButtonProps {
  /** 点击回调（触发文件选择） */
  onAttach: () => void
  /** 是否禁用 */
  disabled?: boolean
}

const AttachButton: React.FC<AttachButtonProps> = ({
  onAttach,
  disabled = false,
}) => {
  return (
    <IconButton label="添加附件" onClick={onAttach} disabled={disabled}>
      <Paperclip className="h-4 w-4" />
    </IconButton>
  )
}
AttachButton.displayName = 'AttachButton'

export { AttachButton }
