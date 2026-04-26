import { MediaClip } from "@stores/MapObject"
import { NodeGroup, PlayMode, setAudioOutputDevice } from "./NodeGroup"

export class NodeGroupForPlayback extends NodeGroup {
  private audioElementForBlob?: HTMLAudioElement
  private clipPlaying: MediaClip|undefined
  private sourceRevision = 0

  playClip(clip?:MediaClip){  //  called by autorun() at ConnectedGroup.ts
    if (!clip) return
    //  Check time to play from.
    if (clip.audioFrom < clip.audioTime){
      console.warn(`Audio from:${clip.audioFrom} start:${clip.audioTime}`)
    }


    let playNow = false
    let playAfterSeek = false
    //  prepare audioElement
    if (!this.audioElementForBlob || !this.sourceNode){
      this.audioElementForBlob = this.createAudioElement()
      this.audioElementForBlob.muted = false
      this.sourceNode = this.context.createMediaElementSource(this.audioElementForBlob)
      if (!clip.pause) playNow = true
    }
    if (!this.audioElement) {
      this.audioElement = this.createAudioElement()
      this.audioElement.muted = false
      if (!clip.pause) playNow = true
    }

    //  Update audioBlob
    const audioOffset = Math.max(0, (clip.audioFrom - clip.audioTime) / 1000.0)
    if (clip.audioBlob && clip.audioBlob !== this.clipPlaying?.audioBlob){
      /*  const {audioBlob, videoBlob, ...clipLog} = clip
          const clipStr = JSON.stringify(clipLog)
          console.log(`playClip audioBlob ${clipStr}`) // */
      const revision = ++this.sourceRevision
      //  The audio element for the context mode
      this.audioElementForBlob.src = URL.createObjectURL(clip.audioBlob)
      this.audioElementForBlob.playbackRate = clip.rate
      this.seekAfterMetadata(this.audioElementForBlob, audioOffset, revision)
      this.sourceNode.connect(this.pannerNode)
      //  The audio element for the element mode
      this.audioElement.src = URL.createObjectURL(clip.audioBlob)
      this.audioElement.playbackRate = clip.rate
      this.seekAfterMetadata(this.audioElement, audioOffset, revision)
      playAfterSeek = !clip.pause
      playNow = false
    }

    //  Update currentTime and playbackRate
    if (clip.audioFrom !== this.clipPlaying?.audioFrom && !playAfterSeek){
      if (this.audioElementForBlob) this.seekAfterMetadata(this.audioElementForBlob, audioOffset)
      if (this.audioElement) this.seekAfterMetadata(this.audioElement, audioOffset)
    }
    //  Update rate
    if (clip.rate !== this.clipPlaying?.rate){
      if (this.audioElementForBlob) this.audioElementForBlob.playbackRate = clip.rate
      if (this.audioElement) this.audioElement.playbackRate = clip.rate
    }

    //  play for both
    if (clip.pause !== this.clipPlaying?.pause){
      const {videoBlob, audioBlob, ...clipLog} = clip
      //  console.log(`NGP: ${clip.pause?'Pause':'Play'} ${JSON.stringify(clipLog)}`)
      if (clip.pause){
        this.audioElementForBlob?.pause()
        this.audioElement?.pause()
      }else if (!playAfterSeek){
        playNow = true
      }
    }
    //  update volume for element mode
    this.updateVolume()

    //  copy the clip to detect changess.
    this.clipPlaying = {...clip}
    //  play() if needed
    if (playAfterSeek) this.playElementsAfterMetadata(this.sourceRevision)
    if (playNow) this.playElements()
  }
  private seekAfterMetadata(audio: HTMLAudioElement, currentTime: number, revision = this.sourceRevision){
    const seek = () => {
      if (revision !== this.sourceRevision) { return }
      try {
        audio.currentTime = currentTime
      }catch(e) {
        console.warn(`Failed to seek playback audio to ${currentTime}.`, e)
      }
    }
    if (audio.readyState >= 1) {
      seek()
    }else {
      audio.addEventListener('loadedmetadata', seek, {once: true})
      audio.load()
    }
  }
  private playElementsAfterMetadata(revision: number){
    const play = () => {
      if (revision !== this.sourceRevision || this.clipPlaying?.pause) { return }
      if ((this.audioElementForBlob?.readyState || 0) >= 1 && (this.audioElement?.readyState || 0) >= 1){
        this.playElements()
      }
    }
    if ((this.audioElementForBlob?.readyState || 0) >= 1 && (this.audioElement?.readyState || 0) >= 1){
      play()
    }else{
      this.audioElementForBlob?.addEventListener('loadedmetadata', play, {once: true})
      this.audioElement?.addEventListener('loadedmetadata', play, {once: true})
    }
  }
  private playElements(){
    if (this.clipPlaying){
      const {videoBlob, audioBlob, ...clipLog} = this.clipPlaying
      //console.log(`playElements for ${JSON.stringify(clipLog)}`)
    }
    this.applyAudioOutput().then(() => {
      this.playElementsWithCurrentOutput()
    })
  }
  private playElementsWithCurrentOutput(){
    const playAgain = (group: NodeGroupForPlayback) => {
      if (!group.clipPlaying?.pause){
        group.audioElementForBlob?.play().catch(()=>{
          window.setTimeout(()=>playAgain(group), 100)
        })
      }
    }
    playAgain(this)
    const playAgain2 = (group: NodeGroupForPlayback) => {
      if (!group.clipPlaying?.pause){
        group.audioElement?.play().catch(()=>{
          window.setTimeout(()=>playAgain2(group), 100)
        })
      }
    }
    playAgain2(this)
  }

  private applyAudioOutput(){
    if (!this.audioDeviceId) { return Promise.resolve(false) }

    const promises: Promise<boolean>[] = []
    if (this.audioElementForBlob) {
      promises.push(setAudioOutputDevice(this.audioElementForBlob, this.audioDeviceId))
    }
    if (this.audioElement) {
      promises.push(setAudioOutputDevice(this.audioElement, this.audioDeviceId))
    }
    return Promise.all(promises).then((results) => results.some(Boolean))
  }

  setAudioOutput(id: string) {
    const promises = [super.setAudioOutput(id)]
    if (this.audioElementForBlob) {
      promises.push(setAudioOutputDevice(this.audioElementForBlob, id))
    }
    return Promise.all(promises).then((results) => results.some(Boolean))
  }


  setPlayMode(playMode: PlayMode|undefined) {
    //  Ignore NodeGroup.setPlayMode()
    this.playMode = playMode
    if (this.audioElementForBlob) this.audioElementForBlob.volume = playMode === 'Context' ? 1 : 0
    this.updateVolume() //  for this.audioElement
  }
}
