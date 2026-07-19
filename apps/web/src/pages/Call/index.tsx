import React, { useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { observer } from 'mobx-react-lite'
import { cn, createLogger } from '@yes/shared'
import { livekitStore, conversationStore } from '@/controller/instances'
import livekitService from '@/service/livekit'
import CallControls from './components/CallControls'
import VideoGrid from './components/VideoGrid'
import CallStatusBar from './components/CallStatusBar'
import AudioVisualizer from './components/AudioVisualizer'

const logger = createLogger('call:page')

/**
 * CallPage — 语音/视频通话页面。
 *
 * 全屏通话界面，类似打电话的视觉效果：
 * - 渐变背景 + 对方头像（无视频时）/ 视频画面
 * - 底部控制栏：静音 / 摄像头 / 扬声器 / 挂断
 * - 通话时长计时器
 */
const CallPage: React.FC = () => {
  const navigate = useNavigate()
  const { connectionState, callState, remoteVideoTrack, remoteAudioTrack, isMuted, isVideoOff } = livekitStore

  /** 进入页面 → 自动获取 Token 并连接 LiveKit */
  useEffect(() => {
    const initCall = async () => {
      try {
        // 用当前 conversationId 作为房间名
        const roomName = `room_${conversationStore.activeId ?? 'default'}`
        const { wsUrl, token } = await livekitService.getToken(roomName)
        await livekitStore.connect(wsUrl, token, roomName)
        logger.info('通话已连接:', roomName)
      } catch (error) {
        logger.error('通话连接失败:', error)
        navigate(-1)
      }
    }

    initCall()

    return () => {
      livekitStore.disconnect()
    }
  }, [navigate])

  /** 挂断通话 */
  const handleHangUp = useCallback(async () => {
    await livekitStore.disconnect()
    navigate(-1)
  }, [navigate])

  /** 返回时断开连接 */
  const handleBack = useCallback(async () => {
    await livekitStore.disconnect()
    navigate(-1)
  }, [navigate])

  return (
    <div className={cn(
      'flex h-full flex-col',
      'bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900',
    )}>
      {/* 顶部状态栏 */}
      <CallStatusBar
        connectionState={connectionState}
        duration={livekitStore.formattedDuration}
        onBack={handleBack}
      />

      {/* 通话主画面 */}
      <div className="flex flex-1 flex-col items-center justify-center p-6">
        {remoteVideoTrack ? (
          <VideoGrid
            remoteTrack={remoteVideoTrack}
            localTrack={livekitStore.localVideoTrack}
            isVideoOff={isVideoOff}
          />
        ) : (
          <div className="flex flex-col items-center gap-6">
            {/* 对方头像占位 */}
            <div className="flex h-32 w-32 items-center justify-center rounded-full bg-slate-700 shadow-lg ring-2 ring-slate-600">
              <span className="text-3xl font-semibold text-slate-300">
                {conversationStore.activeId ? 'AI' : '📞'}
              </span>
            </div>

            {/* 音频波形动画（有远端音频时显示） */}
            {remoteAudioTrack && connectionState === 'connected' && <AudioVisualizer />}

            {/* 等待连接状态 */}
            {connectionState === 'connecting' && (
              <div className="flex flex-col items-center gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
                <span className="text-sm text-slate-400">正在连接...</span>
              </div>
            )}

            {/* 已挂断 */}
            {callState === 'ended' && (
              <div className="flex flex-col items-center gap-2">
                <span className="text-lg text-slate-300">通话已结束</span>
                <span className="text-sm text-slate-500">时长 {livekitStore.formattedDuration}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 底部控制栏 */}
      <CallControls
        isMuted={isMuted}
        isVideoOff={isVideoOff}
        onToggleMute={livekitStore.toggleMute}
        onToggleVideo={livekitStore.toggleVideo}
        onHangUp={handleHangUp}
      />
    </div>
  )
}

CallPage.displayName = 'CallPage'
export default observer(CallPage)
