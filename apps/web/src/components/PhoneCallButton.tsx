import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Phone } from 'lucide-react'
import { cn } from '@yes/shared'

/**
 * PhoneCallButton — 发起语音/视频通话按钮。
 *
 * 放置在 Chat 页面 Header 右上角，点击进入全屏通话页面。
 */
export interface PhoneCallButtonProps {
  className?: string
}

const PhoneCallButton: React.FC<PhoneCallButtonProps> = ({ className }) => {
  const navigate = useNavigate()

  const handleClick = () => {
    navigate('/call')
  }

  return (
    <button
      onClick={handleClick}
      className={cn(
        'rounded-md p-1.5 text-muted-foreground transition-colors',
        'hover:bg-accent hover:text-foreground',
        className,
      )}
      title="语音通话"
    >
      <Phone className="h-5 w-5" />
    </button>
  )
}

PhoneCallButton.displayName = 'PhoneCallButton'
export default PhoneCallButton
