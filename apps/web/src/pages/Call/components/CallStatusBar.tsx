import React from 'react'
import { cn } from '@yes/shared'
import { ArrowLeft } from 'lucide-react'
import type { ConnectionState } from '@/controller/stores/livekit'

/**
 * CallStatusBar — 通话顶部状态栏。
 *
 * 显示返回按钮、连接状态指示、通话时长。
 */
export interface CallStatusBarProps {
  connectionState: ConnectionState
  duration: string
  onBack: () => void
  className?: string
}

const connectionLabels: Record<ConnectionState, string> = {
  disconnected: '未连接',
  connecting: '连接中...',
  connected: '通话中',
  disconnecting: '断开中...',
}

const connectionColors: Record<ConnectionState, string> = {
  disconnected: 'bg-slate-500',
  connecting: 'bg-yellow-400',
  connected: 'bg-green-400',
  disconnecting: 'bg-orange-400',
}

const CallStatusBar: React.FC<CallStatusBarProps> = ({
  connectionState,
  duration,
  onBack,
  className,
}) => {
  return (
    <div className={cn(
      'flex h-12 shrink-0 items-center justify-between px-4',
      className,
    )}>
      {/* 返回按钮 */}
      <button
        onClick={onBack}
        className="flex items-center gap-1 rounded-md p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
        title="返回"
      >
        <ArrowLeft className="h-5 w-5" />
      </button>

      {/* 连接状态 */}
      <div className="flex items-center gap-2">
        <span className={cn('h-2 w-2 rounded-full', connectionColors[connectionState])} />
        <span className="text-sm text-slate-400">
          {connectionLabels[connectionState]}
        </span>
      </div>

      {/* 通话时长 */}
      <span className="font-mono text-sm text-slate-400 tabular-nums">
        {connectionState === 'connected' ? duration : '00:00'}
      </span>
    </div>
  )
}

CallStatusBar.displayName = 'CallStatusBar'
export default CallStatusBar
