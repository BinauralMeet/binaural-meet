import { MediaClip } from "@stores/MapObject"
import { seekMediaElement } from "@models/utils"
import { NodeGroup, PlayMode, setAudioOutputDevice } from "./NodeGroup"

type ActiveAudioPath = 'blob' | 'element' | 'none'

export class NodeGroupForPlayback extends NodeGroup {
  private audioElementForBlob?: HTMLAudioElement
  private clipPlaying: MediaClip|undefined
  private sourceRevision = 0
  private pendingSeek: Promise<void> = Promise.resolve()
  private playRetryTimers: number[] = []
  private activeObjectUrl?: string
  private preparedPath: ActiveAudioPath = 'none'
  private preparedBlob?: Blob
  private tinyDurationRetryCount = 0
  private targetAudioTime = 0

  private activeAudioPath(): ActiveAudioPath {
    if (this.playMode === 'Context') return 'blob'
    if (this.playMode === 'Element') return 'element'
    return 'none'
  }

  private clearAudioElement(audio?: HTMLAudioElement) {
    if (!audio) return
    audio.pause()
    audio.removeAttribute('src')
    try { audio.load() } catch(e) {}
    audio.remove()
  }

  private releaseBlobAudio() {
    this.sourceNode?.disconnect()
    this.sourceNode = undefined
    this.clearAudioElement(this.audioElementForBlob)
    this.audioElementForBlob = undefined
  }

  private releaseElementAudio() {
    this.clearAudioElement(this.audioElement)
    this.audioElement = undefined
  }

  private revokeActiveObjectUrl() {
    if (this.activeObjectUrl) {
      URL.revokeObjectURL(this.activeObjectUrl)
      this.activeObjectUrl = undefined
    }
  }

  private resetPreparedSource() {
    this.revokeActiveObjectUrl()
    this.preparedPath = 'none'
    this.preparedBlob = undefined
    this.tinyDurationRetryCount = 0
    this.targetAudioTime = 0
  }

  private recreateBlobAudio() {
    this.releaseBlobAudio()
    this.audioElementForBlob = this.createAudioElement()
    this.audioElementForBlob.muted = false
    this.audioElementForBlob.volume = 1
    this.sourceNode = this.context.createMediaElementSource(this.audioElementForBlob)
    this.sourceNode.connect(this.pannerNode)
    return this.audioElementForBlob
  }

  private recreateElementAudio() {
    this.releaseElementAudio()
    this.audioElement = this.createAudioElement()
    this.audioElement.muted = false
    this.updateVolume()
    return this.audioElement
  }

  private prepareActiveAudio(clip: MediaClip, audioOffset: number, revision: number,
                             seekPromises: Promise<void>[]) {
    const activePath = this.activeAudioPath()
    if (!clip.audioBlob || activePath === 'none') return

    this.pauseElements()
    this.resetPreparedSource()
    const audioUrl = URL.createObjectURL(clip.audioBlob)
    this.activeObjectUrl = audioUrl
    this.preparedPath = activePath
    this.preparedBlob = clip.audioBlob
    this.targetAudioTime = audioOffset

    if (activePath === 'blob') {
      this.releaseElementAudio()
      const audio = this.recreateBlobAudio()
      audio.src = audioUrl
      audio.playbackRate = clip.rate
      seekPromises.push(this.seekAfterMetadata(audio, audioOffset, revision, clip.audioDuration))
    }else if (activePath === 'element') {
      this.releaseBlobAudio()
      const audio = this.recreateElementAudio()
      audio.src = audioUrl
      audio.playbackRate = clip.rate
      seekPromises.push(this.seekAfterMetadata(audio, audioOffset, revision, clip.audioDuration))
    }
  }

  private activeAudioElement() {
    const activePath = this.activeAudioPath()
    if (activePath === 'blob') return this.audioElementForBlob
    if (activePath === 'element') return this.audioElement
    return undefined
  }

  private playbackAudioTime(currentTime: number) {
    return Math.max(0, currentTime)
  }

  private ensureActiveAudioTime(audio: HTMLAudioElement | undefined, path: ActiveAudioPath) {
    if (!audio || path === 'none' || audio.readyState < 1) return
    const seekTo = this.playbackAudioTime(this.targetAudioTime)
    if (Math.abs(audio.currentTime - seekTo) >= 0.05) {
      try {
        audio.currentTime = seekTo
      } catch(e) {}
    }
  }

  playClip(clip?:MediaClip){  //  called by autorun() at ConnectedGroup.ts
    if (!clip) return
    //  Check time to play from.
    if (clip.audioFrom < clip.audioTime){
      console.warn(`Audio from:${clip.audioFrom} start:${clip.audioTime}`)
    }

    const hasAudioBlob = !!clip.audioBlob
    const activePath = this.activeAudioPath()

    let playNow = false
    const seekPromises: Promise<void>[] = []
    let seekBeforePlay = false

    if (!hasAudioBlob && this.clipPlaying?.audioBlob) {
      this.pauseElements()
      this.releaseBlobAudio()
      this.releaseElementAudio()
      this.resetPreparedSource()
    }

    //  Update audioBlob
    const audioOffset = Math.max(0, (clip.audioFrom - clip.audioTime) / 1000.0)
    if (clip.audioBlob && (clip.audioBlob !== this.preparedBlob || activePath !== this.preparedPath)){
      const revision = ++this.sourceRevision
      this.prepareActiveAudio(clip, audioOffset, revision, seekPromises)
      seekBeforePlay = !clip.pause
      playNow = false
    }

    //  Update currentTime and playbackRate
    if (hasAudioBlob && clip.audioFrom !== this.clipPlaying?.audioFrom && !seekPromises.length){
      const revision = ++this.sourceRevision
      this.pauseElements()
      this.targetAudioTime = audioOffset
      const activeAudio = this.activeAudioElement()
      if (activeAudio && activePath !== 'none') {
        seekPromises.push(this.seekAfterMetadata(activeAudio, audioOffset, revision, clip.audioDuration))
      }
      seekBeforePlay = !clip.pause
      playNow = false
    }
    //  Update rate
    if (clip.rate !== this.clipPlaying?.rate){
      const activeAudio = this.activeAudioElement()
      if (activeAudio) activeAudio.playbackRate = clip.rate
    }

    //  play for both
    if (clip.pause !== this.clipPlaying?.pause){
      if (clip.pause){
        this.pauseElements()
      }else if (hasAudioBlob && !seekBeforePlay){
        seekBeforePlay = true
        playNow = false
      }
    }
    //  update volume for element mode
    if (this.audioElementForBlob) this.audioElementForBlob.volume = this.playMode === 'Context' ? 1 : 0
    this.updateVolume()

    //  copy the clip to detect changess.
    this.clipPlaying = {...clip}
    if (seekPromises.length){
      this.pendingSeek = Promise.all(seekPromises).then(()=>{})
    }
    //  play() if needed
    if (seekBeforePlay) this.playElementsAfterSeek(this.sourceRevision, this.pendingSeek)
    if (playNow) this.playElements(this.sourceRevision)
  }
  private isDurationImplausiblyTiny(audio: HTMLAudioElement | undefined, expectedDurationMs = 0) {
    if (!audio || expectedDurationMs <= 50 || !Number.isFinite(audio.duration)) return false
    return audio.duration > 0 && audio.duration < 0.01
  }

  private waitForUsableDuration(audio: HTMLAudioElement, expectedDurationMs: number,
                                revision: number) {
    if (!this.isDurationImplausiblyTiny(audio, expectedDurationMs)) return Promise.resolve()
    return new Promise<void>((resolve) => {
      let timeout = 0
      const finish = () => {
        audio.removeEventListener('durationchange', check)
        audio.removeEventListener('loadeddata', check)
        audio.removeEventListener('canplay', check)
        audio.removeEventListener('timeupdate', check)
        if (timeout) window.clearTimeout(timeout)
        resolve()
      }
      const check = () => {
        if (revision !== this.sourceRevision || !this.isDurationImplausiblyTiny(audio, expectedDurationMs)) {
          finish()
        }
      }
      audio.addEventListener('durationchange', check)
      audio.addEventListener('loadeddata', check)
      audio.addEventListener('canplay', check)
      audio.addEventListener('timeupdate', check)
      timeout = window.setTimeout(finish, 500)
    })
  }

  private seekAfterMetadata(audio: HTMLAudioElement, currentTime: number, revision = this.sourceRevision,
                            expectedDurationMs = 0){
    if (revision !== this.sourceRevision) {
      return Promise.resolve()
    }
    return seekMediaElement(audio, currentTime).then(() => {
      return this.waitForUsableDuration(audio, expectedDurationMs, revision)
    })
  }
  private playElementsAfterSeek(revision: number, seekReady: Promise<void>){
    seekReady.then(() => {
      if (revision !== this.sourceRevision || this.clipPlaying?.pause) { return }
      this.playElements(revision)
    })
  }
  private playElements(revision: number){
    this.applyAudioOutput().then(() => {
      if (revision !== this.sourceRevision || this.clipPlaying?.pause) { return }
      this.playElementsWithCurrentOutput(revision)
    })
  }

  private playElementsWithCurrentOutput(revision: number){
    const activePath = this.activeAudioPath()
    const playAgain = (group: NodeGroupForPlayback, path: 'blob' | 'element',
                       getAudio: (group: NodeGroupForPlayback) => HTMLAudioElement | undefined) => {
      if (revision === group.sourceRevision && !group.clipPlaying?.pause){
        const audio = getAudio(group)
        const expectedDurationMs = group.clipPlaying?.audioDuration || 0
        group.ensureActiveAudioTime(audio, path)
        if (group.isDurationImplausiblyTiny(audio, expectedDurationMs) && group.tinyDurationRetryCount < 10) {
          group.tinyDurationRetryCount += 1
          group.playRetryTimers.push(window.setTimeout(()=>playAgain(group, path, getAudio), 100))
          return
        }
        audio?.play().catch(()=>{
          group.playRetryTimers.push(window.setTimeout(()=>playAgain(group, path, getAudio), 100))
        })
      }
    }
    if (activePath === 'blob') {
      this.audioElement?.pause()
      playAgain(this, 'blob', group => group.audioElementForBlob)
    }else if (activePath === 'element') {
      this.audioElementForBlob?.pause()
      playAgain(this, 'element', group => group.audioElement)
    }else {
      this.pauseElements()
    }
  }

  private pauseElements(){
    this.clearPlayRetryTimers()
    this.audioElementForBlob?.pause()
    this.audioElement?.pause()
  }

  private clearPlayRetryTimers(){
    for(const timer of this.playRetryTimers){
      window.clearTimeout(timer)
    }
    this.playRetryTimers = []
  }

  private applyAudioOutput(){
    if (!this.audioDeviceId) {
      return Promise.resolve(false)
    }

    const promises: Promise<boolean>[] = []
    if (this.audioElementForBlob) {
      promises.push(setAudioOutputDevice(this.audioElementForBlob, this.audioDeviceId))
    }
    if (this.audioElement) {
      promises.push(setAudioOutputDevice(this.audioElement, this.audioDeviceId))
    }
    return Promise.all(promises).then((results) => {
      return results.some(Boolean)
    })
  }

  setAudioOutput(id: string) {
    const promises = [super.setAudioOutput(id)]
    if (this.audioElementForBlob) {
      promises.push(setAudioOutputDevice(this.audioElementForBlob, id))
    }
    return Promise.all(promises).then((results) => {
      return results.some(Boolean)
    })
  }

  setPlayMode(playMode: PlayMode|undefined) {
    //  Ignore NodeGroup.setPlayMode()
    this.playMode = playMode
    if (this.audioElementForBlob) this.audioElementForBlob.volume = playMode === 'Context' ? 1 : 0
    this.updateVolume() //  for this.audioElement
  }

  dispose() {
    this.clearPlayRetryTimers()
    this.resetPreparedSource()
    this.releaseBlobAudio()
    super.dispose()
  }
}
