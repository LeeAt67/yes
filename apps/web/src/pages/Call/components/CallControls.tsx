import React from 'react'
import { cn } from '@yes/shared'
import { Mic, MicOff, Video, VideoOff, Volume2, PhoneOff } from 'lucide-react'
import { Button } from '@yes/ui'

/**
 * CallControls — 通话底部控制栏。
 *
 * 四个按钮：静音 / 摄像头 / 扬声器 / 挂断
 * 挂断按钮使用红色突出显示。
 */
export interface CallControlsProps {
  isMuted: boolean
  isVideoOff: boolean
  onToggleMute: () => void
  onToggleVideo: () => void
  onHangUp: () => void
  className?: string
}

const CallControls: React.FC<CallControlsProps> = ({
  isMuted,
  isVideoOff,
  onToggleMute,
  onToggleVideo,
  onHangUp,
  className,
}) => {
  return (
    <div className={cn(
      'flex items-center justify-center gap-6 px-6 pb-10 pt-4',
      className,
    )}>
      {/* 静音 */}
      <button
        onClick={onToggleMute}
        className={cn(
          'flex h-12 w-12 items-center justify-center rounded-full transition-colors',
          isMuted
            ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
            : 'bg-white/10 text-white hover:bg-white/20',
        )}
        title={isMuted ? '取消静音' : '静音'}
      >
        {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
      </button>

      {/* 摄像头 */}
      <button
        onClick={onToggleVideo}
        className={cn(
          'flex h-12 w-12 items-center justify-center rounded-full transition-colors',
          isVideoOff
            ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
            : 'bg-white/10 text-white hover:bg-white/20',
        )}
        title={isVideoOff ? '开启摄像头' : '关闭摄像头'}
      >
        {isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
      </button>

      {/* 扬声器 */}
      <button
        className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
        title="扬声器"
        onClick={() => {}}
      >
        <Volume2 className="h-5 w-5" />
      </button>

      {/* 挂断 */}
      <button
        onClick={onHangUp}
        className={cn(
          'flex h-14 w-14 items-center justify-center rounded-full',
          'bg-red-500 text-white shadow-lg shadow-red-500/30',
          'transition-transform hover:scale-110 active:scale-95',
        )}
        title="挂断"
      >
        <PhoneOff className="h-6 w-6" />
      </button>
    </div>
  )
}

CallControls.displayName = 'CallControls'
export default CallControls
