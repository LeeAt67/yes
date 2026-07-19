import React from 'react'
import { cn } from '@yes/shared'
import type { RemoteTrack, LocalTrack } from 'livekit-client'

/**
 * VideoGrid — 视频画面布局组件。
 *
 * 远端视频全屏 + 本地画中画。
 */
export interface VideoGridProps {
  /** 远端视频轨道 */
  remoteTrack: RemoteTrack
  /** 本地视频轨道 */
  localTrack: LocalTrack | null
  /** 是否关闭摄像头 */
  isVideoOff: boolean
  className?: string
}

const VideoGrid: React.FC<VideoGridProps> = ({
  remoteTrack,
  localTrack,
  isVideoOff,
  className,
}) => {
  const remoteRef = React.useRef<HTMLVideoElement>(null)
  const localRef = React.useRef<HTMLVideoElement>(null)

  // 远端视频绑定
  React.useEffect(() => {
    const el = remoteRef.current
    if (!el || !remoteTrack) return
    const mediaStream = new MediaStream([remoteTrack.mediaStreamTrack])
    el.srcObject = mediaStream
    return () => { el.srcObject = null }
  }, [remoteTrack])

  // 本地视频绑定
  React.useEffect(() => {
    const el = localRef.current
    if (!el || !localTrack || isVideoOff) return
    const mediaStream = new MediaStream([localTrack.mediaStreamTrack])
    el.srcObject = mediaStream
    return () => { el.srcObject = null }
  }, [localTrack, isVideoOff])

  return (
    <div className={cn('relative flex h-full w-full items-center justify-center', className)}>
      {/* 远端视频画面（全屏） */}
      <video
        ref={remoteRef}
        autoPlay
        playsInline
        className="h-full w-full rounded-xl object-cover"
      />

      {/* 本地视频画中画 */}
      {!isVideoOff && localTrack && (
        <div className="absolute bottom-4 right-4 overflow-hidden rounded-lg border-2 border-white/30 shadow-lg">
          <video
            ref={localRef}
            autoPlay
            playsInline
            muted
            className="h-32 w-44 object-cover"
          />
        </div>
      )}
    </div>
  )
}

VideoGrid.displayName = 'VideoGrid'
export default VideoGrid
