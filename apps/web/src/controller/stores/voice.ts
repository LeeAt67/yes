import { makeAutoObservable } from 'mobx'

/**
 * 语音 Store（骨架）。
 */
class VoiceStore {
  recording = false
  muted = false

  constructor() {
    makeAutoObservable(this)
  }

  toggleRecording = () => {
    this.recording = !this.recording
  }

  toggleMute = () => {
    this.muted = !this.muted
  }
}

export default VoiceStore
