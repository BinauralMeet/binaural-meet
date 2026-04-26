import { MediaClip } from "@stores/MapObject"
import { seekMediaElement } from "@models/utils"
import { playbackAudioDebug } from "@models/utils/playbackAudioDebug"
import { NodeGroup, PlayMode, setAudioOutputDevice } from "./NodeGroup"

const describeMediaElement = (audio?: HTMLAudioElement) => {
  if (!audio) return undefined
  const audioEx: any = audio
  return {
    readyState: audio.readyState,
    networkState: audio.networkState,
    paused: audio.paused,
    muted: audio.muted,
    volume: audio.volume,
    currentTime: audio.currentTime,
    duration: Number.isFinite(audio.duration) ? audio.duration : String(audio.duration),
    hasSrc: !!audio.src,
    srcPrefix: audio.src ? audio.src.slice(0, 24) : '',
    hasSrcObject: !!audio.srcObject,
    sinkId: audioEx.sinkId,
    error: audio.error ? {code: audio.error.code, message: audio.error.message} : undefined,
  }
}
const describePlaybackError = (e: unknown) => {
  if (e instanceof Error) return {name: e.name, message: e.message}
  return e
}

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

    playbackAudioDebug('prepare active playback audio', {
      activePath,
      revision,
      audioOffset,
      audioDuration: clip.audioDuration,
      blobSize: clip.audioBlob.size,
      blobType: clip.audioBlob.type,
    })

    if (activePath === 'blob') {
      this.releaseElementAudio()
      const audio = this.recreateBlobAudio()
      audio.src = audioUrl
      audio.playbackRate = clip.rate
      seekPromises.push(this.seekAfterMetadata(audio, audioOffset, revision, activePath, clip.audioDuration))
    }else if (activePath === 'element') {
      this.releaseBlobAudio()
      const audio = this.recreateElementAudio()
      audio.src = audioUrl
      audio.playbackRate = clip.rate
      seekPromises.push(this.seekAfterMetadata(audio, audioOffset, revision, activePath, clip.audioDuration))
    }
  }

  private activeAudioElement() {
    const activePath = this.activeAudioPath()
    if (activePath === 'blob') return this.audioElementForBlob
    if (activePath === 'element') return this.audioElement
    return undefined
  }

  playClip(clip?:MediaClip){  //  called by autorun() at ConnectedGroup.ts
    if (!clip) return
    //  Check time to play from.
    if (clip.audioFrom < clip.audioTime){
      console.warn(`Audio from:${clip.audioFrom} start:${clip.audioTime}`)
    }


    const clipChanged = !this.clipPlaying || clip.audioBlob !== this.clipPlaying.audioBlob
      || clip.audioFrom !== this.clipPlaying.audioFrom || clip.pause !== this.clipPlaying.pause
      || clip.rate !== this.clipPlaying.rate || clip.audioDuration !== this.clipPlaying.audioDuration
    const hasAudioBlob = !!clip.audioBlob
    const bloblessActiveClip = !hasAudioBlob && !clip.pause
    const activePath = this.activeAudioPath()
    if (clipChanged) {
      playbackAudioDebug('NodeGroupForPlayback.playClip', {
        activePath,
        preparedPath: this.preparedPath,
        hypothesisBloblessActiveClip: bloblessActiveClip,
        hasAudioBlob,
        audioBlobSize: clip.audioBlob?.size,
        audioBlobType: clip.audioBlob?.type,
        audioDuration: clip.audioDuration,
        audioFrom: clip.audioFrom,
        audioTime: clip.audioTime,
        pause: clip.pause,
        rate: clip.rate,
        playMode: this.playMode,
        sourceRevision: this.sourceRevision,
        audioDeviceId: this.audioDeviceId,
      })
    }
    if (bloblessActiveClip) {
      playbackAudioDebug('BLOBLESS_ACTIVE_CLIP playClip entered before audioBlob is set', {
        clipChanged,
        audioFrom: clip.audioFrom,
        audioTime: clip.audioTime,
        pause: clip.pause,
        rate: clip.rate,
        sourceRevision: this.sourceRevision,
        hasExistingBlobElement: !!this.audioElementForBlob,
        hasExistingElement: !!this.audioElement,
        previousHasAudioBlob: !!this.clipPlaying?.audioBlob,
        previousPause: this.clipPlaying?.pause,
      })
    }

    let playNow = false
    const seekPromises: Promise<void>[] = []
    let seekBeforePlay = false

    if (!hasAudioBlob && this.clipPlaying?.audioBlob) {
      playbackAudioDebug('audio blob cleared; release prepared playback audio', {
        activePath,
        preparedPath: this.preparedPath,
      })
      this.pauseElements()
      this.releaseBlobAudio()
      this.releaseElementAudio()
      this.resetPreparedSource()
    }

    //  Update audioBlob
    const audioOffset = Math.max(0, (clip.audioFrom - clip.audioTime) / 1000.0)
    if (clip.audioBlob && (clip.audioBlob !== this.preparedBlob || activePath !== this.preparedPath)){
      /*  const {audioBlob, videoBlob, ...clipLog} = clip
          const clipStr = JSON.stringify(clipLog)
          console.log(`playClip audioBlob ${clipStr}`) // */
      const revision = ++this.sourceRevision
      playbackAudioDebug('audio blob changed', {
        revision,
        audioOffset,
        activePath,
        preparedPath: this.preparedPath,
        hadBloblessActiveClipBeforeBlob: bloblessActiveClip || (!this.clipPlaying?.audioBlob && this.clipPlaying?.pause === false),
        previousHasAudioBlob: !!this.clipPlaying?.audioBlob,
        previousPause: this.clipPlaying?.pause,
        audioDuration: clip.audioDuration,
        blobSize: clip.audioBlob.size,
        blobType: clip.audioBlob.type,
      })
      this.prepareActiveAudio(clip, audioOffset, revision, seekPromises)
      seekBeforePlay = !clip.pause
      playNow = false
    }

    //  Update currentTime and playbackRate
    if (hasAudioBlob && clip.audioFrom !== this.clipPlaying?.audioFrom && !seekPromises.length){
      const revision = ++this.sourceRevision
      playbackAudioDebug('audioFrom changed; seeking existing audio elements', {
        revision,
        activePath,
        hypothesisSeekWithoutBlob: !hasAudioBlob,
        hypothesisBloblessActiveClip: bloblessActiveClip,
        audioOffset,
        audioFrom: clip.audioFrom,
        audioTime: clip.audioTime,
      })
      this.pauseElements()
      const activeAudio = this.activeAudioElement()
      if (activeAudio && activePath !== 'none') {
        seekPromises.push(this.seekAfterMetadata(activeAudio, audioOffset, revision, activePath, clip.audioDuration))
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
      const {videoBlob, audioBlob, ...clipLog} = clip
      //  console.log(`NGP: ${clip.pause?'Pause':'Play'} ${JSON.stringify(clipLog)}`)
      playbackAudioDebug('clip pause changed', {...clipLog})
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
    if (seekBeforePlay || playNow) {
      playbackAudioDebug('play decision', {
        seekBeforePlay,
        playNow,
        activePath: this.activeAudioPath(),
        hypothesisBloblessActiveClip: bloblessActiveClip,
        willPlayWithoutAudioBlob: !hasAudioBlob,
        sourceRevision: this.sourceRevision,
        pendingSeek: seekPromises.length,
        blobAudio: describeMediaElement(this.audioElementForBlob),
        elementAudio: describeMediaElement(this.audioElement),
      })
    }
    if (seekBeforePlay) this.playElementsAfterSeek(this.sourceRevision, this.pendingSeek)
    if (playNow) this.playElements(this.sourceRevision)
  }
  private isDurationImplausiblyTiny(audio: HTMLAudioElement | undefined, expectedDurationMs = 0) {
    if (!audio || expectedDurationMs <= 50 || !Number.isFinite(audio.duration)) return false
    return audio.duration > 0 && audio.duration < 0.01
  }

  private waitForUsableDuration(audio: HTMLAudioElement, expectedDurationMs: number,
                                revision: number, path: 'blob' | 'element' | 'unknown') {
    if (!this.isDurationImplausiblyTiny(audio, expectedDurationMs)) return Promise.resolve()
    playbackAudioDebug('waiting because playback audio duration is implausibly tiny', {
      path,
      revision,
      expectedDurationMs,
      audio: describeMediaElement(audio),
    })
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
                            path: 'blob' | 'element' | 'unknown' = 'unknown', expectedDurationMs = 0){
    if (revision !== this.sourceRevision) {
      playbackAudioDebug('seek skipped by stale revision', {path, revision, sourceRevision: this.sourceRevision})
      return Promise.resolve()
    }
    playbackAudioDebug('seek start', {
      path,
      currentTime,
      revision,
      expectedDurationMs,
      audio: describeMediaElement(audio),
    })
    return seekMediaElement(audio, currentTime).then(() => {
      return this.waitForUsableDuration(audio, expectedDurationMs, revision, path)
    }).then(() => {
      playbackAudioDebug('seek done', {
        path,
        currentTime,
        revision,
        expectedDurationMs,
        durationStillImplausible: this.isDurationImplausiblyTiny(audio, expectedDurationMs),
        audio: describeMediaElement(audio),
      })
    })
  }
  private playElementsAfterSeek(revision: number, seekReady: Promise<void>){
    playbackAudioDebug('waiting seek before play', {revision, sourceRevision: this.sourceRevision})
    seekReady.then(() => {
      playbackAudioDebug('seek promise resolved before play', {
        revision,
        sourceRevision: this.sourceRevision,
        pause: this.clipPlaying?.pause,
      })
      if (revision !== this.sourceRevision || this.clipPlaying?.pause) { return }
      this.playElements(revision)
    })
  }
  private playElements(revision: number){
    if (this.clipPlaying){
      const {videoBlob, audioBlob, ...clipLog} = this.clipPlaying
      //console.log(`playElements for ${JSON.stringify(clipLog)}`)
      playbackAudioDebug('playElements requested', {...clipLog})
    }
    this.applyAudioOutput().then(() => {
      playbackAudioDebug('applyAudioOutput resolved before play()', {
        revision,
        sourceRevision: this.sourceRevision,
        pause: this.clipPlaying?.pause,
        blobAudio: describeMediaElement(this.audioElementForBlob),
        elementAudio: describeMediaElement(this.audioElement),
      })
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
        if (group.isDurationImplausiblyTiny(audio, expectedDurationMs) && group.tinyDurationRetryCount < 10) {
          group.tinyDurationRetryCount += 1
          playbackAudioDebug('play delayed because playback audio duration is implausibly tiny', {
            path,
            activePath,
            revision,
            retry: group.tinyDurationRetryCount,
            expectedDurationMs,
            audio: describeMediaElement(audio),
          })
          group.playRetryTimers.push(window.setTimeout(()=>playAgain(group, path, getAudio), 100))
          return
        }
        playbackAudioDebug('calling play() for playback audio', {path, activePath, audio: describeMediaElement(audio)})
        audio?.play().then(() => {
          playbackAudioDebug('play() succeeded for playback audio', {path, activePath, audio: describeMediaElement(audio)})
        }).catch((e)=>{
          playbackAudioDebug('play() failed for playback audio', {
            path,
            activePath,
            error: describePlaybackError(e),
            audio: describeMediaElement(audio),
          })
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
    playbackAudioDebug('pauseElements', {
      blobAudio: describeMediaElement(this.audioElementForBlob),
      elementAudio: describeMediaElement(this.audioElement),
    })
    this.clearPlayRetryTimers()
    this.audioElementForBlob?.pause()
    this.audioElement?.pause()
  }

  private clearPlayRetryTimers(){
    if (this.playRetryTimers.length) {
      playbackAudioDebug('clear play retry timers', {count: this.playRetryTimers.length})
    }
    for(const timer of this.playRetryTimers){
      window.clearTimeout(timer)
    }
    this.playRetryTimers = []
  }

  private applyAudioOutput(){
    if (!this.audioDeviceId) {
      playbackAudioDebug('applyAudioOutput skipped; audioDeviceId is empty', {
        blobAudio: describeMediaElement(this.audioElementForBlob),
        elementAudio: describeMediaElement(this.audioElement),
      })
      return Promise.resolve(false)
    }

    const promises: Promise<boolean>[] = []
    if (this.audioElementForBlob) {
      promises.push(setAudioOutputDevice(this.audioElementForBlob, this.audioDeviceId))
    }
    if (this.audioElement) {
      promises.push(setAudioOutputDevice(this.audioElement, this.audioDeviceId))
    }
    playbackAudioDebug('applyAudioOutput start', {audioDeviceId: this.audioDeviceId, count: promises.length})
    return Promise.all(promises).then((results) => {
      playbackAudioDebug('applyAudioOutput done', {
        audioDeviceId: this.audioDeviceId,
        results,
        blobAudio: describeMediaElement(this.audioElementForBlob),
        elementAudio: describeMediaElement(this.audioElement),
      })
      return results.some(Boolean)
    })
  }

  setAudioOutput(id: string) {
    playbackAudioDebug('NodeGroupForPlayback.setAudioOutput', {
      id,
      currentAudioDeviceId: this.audioDeviceId,
      blobAudio: describeMediaElement(this.audioElementForBlob),
      elementAudio: describeMediaElement(this.audioElement),
    })
    const promises = [super.setAudioOutput(id)]
    if (this.audioElementForBlob) {
      promises.push(setAudioOutputDevice(this.audioElementForBlob, id))
    }
    return Promise.all(promises).then((results) => {
      playbackAudioDebug('NodeGroupForPlayback.setAudioOutput done', {
        id,
        results,
        blobAudio: describeMediaElement(this.audioElementForBlob),
        elementAudio: describeMediaElement(this.audioElement),
      })
      return results.some(Boolean)
    })
  }

  setPlayMode(playMode: PlayMode|undefined) {
    //  Ignore NodeGroup.setPlayMode()
    playbackAudioDebug('NodeGroupForPlayback.setPlayMode', {
      playMode,
      previousPlayMode: this.playMode,
      blobAudio: describeMediaElement(this.audioElementForBlob),
      elementAudio: describeMediaElement(this.audioElement),
    })
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
