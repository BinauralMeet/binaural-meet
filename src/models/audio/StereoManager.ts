import { conference } from '@models/conference'
import {assert} from '@models/utils'
import errorInfo from '@stores/room/ErrorInfo'
import {autorun} from 'mobx'
import {getAudioOutputDevice, NodeGroup, PlayMode, setAudioOutputDevice} from './NodeGroup'
import { NodeGroupForPlayback } from './NodeGroupForPlayback'

const spkLog = import.meta.env.DEV ? console.log.bind(console) : (..._: any[]) => {}

export class StereoManager {
  private readonly audioContext: AudioContext = new window.AudioContext()
  private readonly audioDestination = this.audioContext.createMediaStreamDestination()

  private readonly audioElement = new Audio()   //  audioElement for context mode
  private playMode: PlayMode = 'Pause'
  private audioDeviceId = ''

  nodes: {
    [key: string]: NodeGroup,
  } = {}

  constructor() {
    this.audioElement.srcObject = this.audioDestination.stream
  }

  addSpeaker(id: string) {
    assert(this.nodes[id] === undefined)
    const node = new NodeGroup(this.audioContext, this.audioDestination,
                               this.playMode, !this.audioOutputMuted)
    this.nodes[id] = node
    if (this.audioDeviceId) {
      node.setAudioOutput(this.audioDeviceId).catch(()=>{})
    }

    return node
  }
  addPlayback(id: string) {
    assert(this.nodes[id] === undefined)
    const node = new NodeGroupForPlayback(this.audioContext, this.audioDestination,
                                   this.playMode, !this.audioOutputMuted)
    this.nodes[id] = node
    if (this.audioDeviceId) {
      node.setAudioOutput(this.audioDeviceId).catch(()=>{})
    }
    this.preparePlaybackOutput()

    return node
  }
  removeSpeaker(id: string) {
    this.nodes[id].dispose()
    delete this.nodes[id]
  }

  switchPlayMode(playMode: PlayMode, muted: boolean) {
    assert(playMode !== 'Pause')
    if (this.playMode === 'Pause') {
      //  this occurs only once when valid playMode has been set
      autorun(() => {
        const accepts = new Set(conference.priorityCalculator.tracksToConsume.audios.map(
          info => info.producer.role === 'avatar' ? info.producer.peer.peer : info.producer.role
        ))
        for (const id in this.nodes) {
          if (accepts.has(id) || this.nodes[id] instanceof NodeGroupForPlayback) {
            this.nodes[id].setPlayMode(this.playMode)
          }else {
            this.nodes[id].setPlayMode('Pause')
          }
        }
      })
    }

    if (playMode === this.playMode && muted === this.audioOutputMuted) {
      return
    }
    this.playMode = playMode

    switch (playMode) {
      case 'Context':
        // For Chrome, resume audio context when loaded (https://goo.gl/7K7WLu)
        // AudioContext must be resumed (or created) after a user gesture on the page.
        const interval = window.setInterval(
          () => {
            if (errorInfo.type) { return }
            if (this.audioContext.state !== 'suspended') {
              window.clearInterval(interval)
            }
            this.audioContext.resume()
            this.audioElement.play()  //  play() must be delayed
          },
          1000,
        )

        for (const id in this.nodes) {
          this.nodes[id].setPlayMode(playMode)
        }
        break

      case 'Element':
        this.audioContext.suspend()
        this.audioElement.pause()

        for (const id in this.nodes) {
          this.nodes[id].setPlayMode(playMode)
        }
        break

      default:
        console.error(`Unsupported play mode: ${playMode}`)
        break
    }

    this.audioOutputMuted = muted
  }

  public setAudioOutput(deviceId:string) {
    this.audioDeviceId = deviceId
    const audioEx:any = this.audioElement
    spkLog(`[SPK] setAudioOutput called: deviceId=${deviceId} playMode=${this.playMode} muted=${this.audioOutputMuted} sinkId=${audioEx.sinkId} hasSinkId=${!!audioEx.setSinkId} nodeCount=${Object.keys(this.nodes).length}`)
    const promises = [setAudioOutputDevice(this.audioElement, deviceId)]
    for (const node in this.nodes) {
      promises.push(this.nodes[node].setAudioOutput(deviceId))
    }
    return Promise.all(promises).then((results) => {
      spkLog(`[SPK] setAudioOutput results: ${JSON.stringify(results)} some=${results.some(Boolean)} playMode=${this.playMode} muted=${this.audioOutputMuted} sinkId=${audioEx.sinkId}`)
      if (results.some(Boolean) && this.playMode === 'Context' && !this.audioOutputMuted) {
        this.audioContext.resume().catch(()=>{})
        this.audioElement.play().catch((e)=>{ spkLog('[SPK] play() failed:', e) })
      }
      return results.some(Boolean)
    })
  }
  public getAudioOutput(){
    return getAudioOutputDevice(this.audioElement)
  }

  public preparePlaybackOutput(){
    if (this.audioOutputMuted) { return }
    this.audioContext.resume().catch(()=>{})
    this.audioElement.play().catch(()=>{})
  }

  set audioOutputMuted(muted: boolean) {
    for (const id in this.nodes) {
      this.nodes[id].updateAudibility(!muted)
    }
    this.audioDestination.stream.getTracks().forEach((track) => { track.enabled = !muted })
  }
  get audioOutputMuted():boolean {
    return !(this.audioDestination.stream.getTracks().length > 0
      && this.audioDestination.stream.getTracks()[0].enabled)
  }
}
