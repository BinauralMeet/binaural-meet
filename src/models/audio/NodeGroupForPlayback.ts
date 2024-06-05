import { MediaClip } from "@stores/MapObject"
import { NodeGroup, PlayMode } from "./NodeGroup"

export class NodeGroupForPlayback extends NodeGroup {
  private audioElementForBlob?: HTMLAudioElement
  private clipPlaying: MediaClip|undefined

  playClip(clip?:MediaClip){  //  called by autorun() at ConnectedGroup.ts
    if (!clip) return
    //  Check time to play from.
    if (clip.audioFrom < clip.audioTime){
      console.warn(`Audio from:${clip.audioFrom} start:${clip.audioTime}`)
    }


    let playNow = false
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
    if (clip.audioBlob && clip.audioBlob !== this.clipPlaying?.audioBlob){
      /*  const {audioBlob, videoBlob, ...clipLog} = clip
          const clipStr = JSON.stringify(clipLog)
          console.log(`playClip audioBlob ${clipStr}`) // */
      //  The audio element for the context mode
      this.audioElementForBlob.src = URL.createObjectURL(clip.audioBlob)
      this.audioElementForBlob.playbackRate = clip.rate
      this.sourceNode.connect(this.pannerNode)
      //  The audio element for the element mode
      this.audioElement.src = URL.createObjectURL(clip.audioBlob)
      this.audioElement.playbackRate = clip.rate
      if (!clip.pause) playNow = true
    }

    //  Update currentTime and playbackRate
    if (clip.audioFrom !== this.clipPlaying?.audioFrom){
      const ct = (clip.audioFrom - clip.audioTime) / 1000.0
      if (this.audioElementForBlob) this.audioElementForBlob.currentTime = ct
      if (this.audioElement) this.audioElement.currentTime = ct
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
      }else{
        playNow = true
      }
    }
    //  update volume for element mode
    this.updateVolume()

    //  copy the clip to detect changess.
    this.clipPlaying = {...clip}
    //  play() if needed
    if (playNow) this.playElements()
  }
  private playElements(){
    if (this.clipPlaying){
      const {videoBlob, audioBlob, ...clipLog} = this.clipPlaying
      //console.log(`playElements for ${JSON.stringify(clipLog)}`)
    }
    const playAgain = (group: NodeGroupForPlayback) => {
      if (!group.clipPlaying?.pause){
        group.audioElementForBlob?.play().catch(()=>{
          setTimeout(()=>playAgain(group), 100)
        })
      }
    }
    playAgain(this)
    const playAgain2 = (group: NodeGroupForPlayback) => {
      if (!group.clipPlaying?.pause){
        group.audioElement?.play().catch(()=>{
          setTimeout(()=>playAgain2(group), 100)
        })
      }
    }
    playAgain2(this)
  }


  setPlayMode(playMode: PlayMode|undefined) {
    //  Ignore NodeGroup.setPlayMode()
    this.playMode = playMode
    if (this.audioElementForBlob) this.audioElementForBlob.volume = playMode === 'Context' ? 1 : 0
    this.updateVolume() //  for this.audioElement
  }
}
