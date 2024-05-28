import { MediaClip } from "@stores/MapObject"
import { NodeGroup, PlayMode } from "./NodeGroup"
import { IReactionDisposer, autorun, observable } from "mobx"

export class NodeGroupForPlayback extends NodeGroup {
  private audioElementForBlob?: HTMLAudioElement
  private clipPlaying: MediaClip|undefined

  playClip(clip?:MediaClip){  //  called by autorun() at ConnectedGroup.ts
    if (!clip?.audioBlob) {
      if (this.sourceNode) { this.sourceNode.disconnect() }
      this.sourceNode = undefined
      return
    }
    //  Update audioBlob
    if (clip.audioBlob && clip.audioBlob !== this.clipPlaying?.audioBlob){
      //  The audio element for the context mode
      if (this.audioElementForBlob){ this.audioElementForBlob.remove() }
      this.audioElementForBlob = this.createAudioElement()
      this.audioElementForBlob.src = URL.createObjectURL(clip.audioBlob)
      this.sourceNode = this.context.createMediaElementSource(this.audioElementForBlob)
      this.sourceNode.connect(this.pannerNode)
      this.audioElementForBlob.muted = false
      //  The audio element for the element mode
      if (this.audioElement === undefined) {
        this.audioElement = this.createAudioElement()
        this.audioElement.muted = false
      }
      this.audioElement.src = URL.createObjectURL(clip.audioBlob)
    }

    //  Update currentTime and playbackRate
    if (clip.audioTime !== this.clipPlaying?.audioTime){
      const ct = (clip.timeFrom - clip.audioTime) / 1000.0
      if (this.audioElementForBlob) this.audioElementForBlob.currentTime = ct
      if (this.audioElement) this.audioElement.currentTime = ct
    }
    if (clip.rate !== this.clipPlaying?.rate){
      if (this.audioElementForBlob) this.audioElementForBlob.playbackRate = clip.rate
      if (this.audioElement) this.audioElement.playbackRate = clip.rate
    }

    //  play for both
    if (clip.pause !== this.clipPlaying?.pause)
    if (clip.pause){
      this.audioElementForBlob?.pause()
      this.audioElement?.pause()
    }else{
      const playAgain = (group: NodeGroupForPlayback) => {
        group.audioElementForBlob?.play().catch(()=>{
          setTimeout(()=>playAgain(group), 500)
        })
      }
      playAgain(this)
      const playAgain2 = (group: NodeGroupForPlayback) => {
        group.audioElement?.play().catch(()=>{
          setTimeout(()=>playAgain2(group), 500)
        })
      }
      playAgain2(this)
    }
    //  update volume for element mode
    this.updateVolume()
    //
    this.clipPlaying = {...clip}
  }

  setPlayMode(playMode: PlayMode|undefined) {
    //  Ignore NodeGroup.setPlayMode()
    this.playMode = playMode
    if (this.audioElementForBlob) this.audioElementForBlob.volume = playMode === 'Context' ? 1 : 0
    this.updateVolume() //  for this.audioElement
  }
}
