import { makeAutoObservable, runInAction } from 'mobx'
import { Room, RoomEvent, RemoteAudioTrack, type LocalTrack, type RemoteTrack } from 'livekit-client'
import { createLogger } from '@yes/shared'

const logger = createLogger('livekit:store')

/** 房间连接状态 */
export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'disconnecting'

/** 通话状态 */
export type CallState = 'idle' | 'dialing' | 'in-call' | 'ended'

/**
 * LiveKitStore — 语音/视频通话状态管理。
 *
 * 管理 LiveKit Room 生命周期、本地/远端轨道、静音/视频开关。
 */
class LiveKitStore {
  /** LiveKit Room 实例 */
  room: Room = new Room()

  /** 连接状态 */
  connectionState: ConnectionState = 'disconnected'

  /** 通话状态 */
  callState: CallState = 'idle'

  /** 本地音频轨道 */
  localAudioTrack: LocalTrack | null = null

  /** 本地视频轨道 */
  localVideoTrack: LocalTrack | null = null

  /** 远端音频轨道 */
  remoteAudioTrack: RemoteTrack | null = null

  /** 远端视频轨道 */
  remoteVideoTrack: RemoteTrack | null = null

  /** 是否静音 */
  isMuted = false

  /** 是否关闭摄像头 */
  isVideoOff = false

  /** 通话时长（秒） */
  callDuration = 0

  private durationTimer: ReturnType<typeof setInterval> | null = null
  private currentRoomName: string | null = null

  constructor() {
    makeAutoObservable(this)
    this.setupRoomListeners()
  }

  /** 注册 Room 事件监听 */
  private setupRoomListeners = () => {
    this.room.on(RoomEvent.Connected, () => {
      runInAction(() => {
        this.connectionState = 'connected'
        this.callState = 'in-call'
      })
      this.startDurationTimer()
      logger.info('已连接到 LiveKit 房间')
    })

    this.room.on(RoomEvent.Disconnected, () => {
      runInAction(() => {
        this.connectionState = 'disconnected'
        this.callState = 'ended'
      })
      this.stopDurationTimer()
      this.cleanupTracks()
      logger.info('已断开 LiveKit 房间')
    })

    this.room.on(RoomEvent.TrackSubscribed, (track) => {
      this.handleTrackSubscribed(track)
    })

    this.room.on(RoomEvent.TrackUnsubscribed, (track) => {
      this.handleTrackUnsubscribed(track)
    })

    this.room.on(RoomEvent.Reconnecting, () => {
      runInAction(() => { this.connectionState = 'connecting' })
      logger.info('正在重连 LiveKit 房间...')
    })
  }

  /** 处理远端轨道订阅 */
  private handleTrackSubscribed = (track: RemoteTrack) => {
    runInAction(() => {
      if (track.kind === 'audio') {
        this.remoteAudioTrack = track
      } else if (track.kind === 'video') {
        this.remoteVideoTrack = track
      }
    })
    logger.info('收到远端轨道:', track.kind)
  }

  /** 处理远端轨道取消订阅 */
  private handleTrackUnsubscribed = (track: RemoteTrack) => {
    runInAction(() => {
      if (track.kind === 'audio') {
        this.remoteAudioTrack = null
      } else if (track.kind === 'video') {
        this.remoteVideoTrack = null
      }
    })
  }

  /**
   * 连接到 LiveKit 房间。
   *
   * @param wsUrl - WebSocket 地址
   * @param token - 签发的 Access Token
   * @param roomName - 房间名称
   */
  connect = async (wsUrl: string, token: string, roomName: string) => {
    if (this.room.state !== 'disconnected') {
      logger.warn('房间未断开，先断开再连接')
      await this.disconnect()
    }

    this.currentRoomName = roomName
    runInAction(() => {
      this.connectionState = 'connecting'
      this.callState = 'dialing'
    })

    try {
      await this.room.connect(wsUrl, token)
    } catch (error) {
      runInAction(() => {
        this.connectionState = 'disconnected'
        this.callState = 'idle'
      })
      logger.error('连接 LiveKit 房间失败:', error)
      throw error
    }
  }

  /**
   * 断开 LiveKit 房间连接。
   */
  disconnect = async () => {
    if (this.room.state === 'disconnected') {
      runInAction(() => {
        this.connectionState = 'disconnected'
        this.callState = 'idle'
      })
      return
    }

    runInAction(() => { this.connectionState = 'disconnecting' })

    try {
      await this.room.disconnect()
    } catch (error) {
      logger.warn('断开连接时出错:', error)
    } finally {
      runInAction(() => {
        this.connectionState = 'disconnected'
        this.callState = 'idle'
      })
      this.stopDurationTimer()
      this.cleanupTracks()
    }
  }

  /**
   * 切换麦克风静音。
   */
  toggleMute = async () => {
    const newState = !this.isMuted
    try {
      await this.room.localParticipant.setMicrophoneEnabled(!newState)
      runInAction(() => { this.isMuted = newState })
    } catch (error) {
      logger.warn('切换麦克风失败:', error)
    }
  }

  /**
   * 切换摄像头开关。
   */
  toggleVideo = async () => {
    const newState = !this.isVideoOff
    try {
      await this.room.localParticipant.setCameraEnabled(!newState)
      runInAction(() => { this.isVideoOff = newState })
    } catch (error) {
      logger.warn('切换摄像头失败:', error)
    }
  }

  /**
   * 开启/关闭扬声器。
   */
  setSpeakerOn = (on: boolean) => {
    this.room.remoteParticipants.forEach((participant) => {
      participant.getTrackPublications().forEach((pub) => {
        if (pub.kind === 'audio' && pub.track instanceof RemoteAudioTrack) {
          pub.track.setVolume(on ? 1 : 0)
        }
      })
    })
  }

  /** 清理本地/远端轨道引用 */
  private cleanupTracks = () => {
    this.localAudioTrack = null
    this.localVideoTrack = null
    this.remoteAudioTrack = null
    this.remoteVideoTrack = null
  }

  /** 启动通话计时器 */
  private startDurationTimer = () => {
    this.stopDurationTimer()
    runInAction(() => { this.callDuration = 0 })
    this.durationTimer = setInterval(() => {
      runInAction(() => { this.callDuration += 1 })
    }, 1000)
  }

  /** 停止通话计时器 */
  private stopDurationTimer = () => {
    if (this.durationTimer) {
      clearInterval(this.durationTimer)
      this.durationTimer = null
    }
  }

  /**
   * 格式化通话时长。
   *
   * @returns mm:ss 格式字符串
   */
  get formattedDuration(): string {
    const m = Math.floor(this.callDuration / 60)
    const s = this.callDuration % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }
}

export default LiveKitStore
