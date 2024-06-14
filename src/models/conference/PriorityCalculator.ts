import {Conference} from '@models/conference'
import {RemoteProducer} from './RtcConnection'
import {isContentRtc} from '@models/ISharedContent'
import {PARTICIPANT_SIZE} from '@models/Participant'
import {participants} from '@stores/'
import {LocalParticipant} from '@stores/participants/LocalParticipant'
import contents from '@stores/sharedContents/SharedContents'
import {autorun, IReactionDisposer, makeObservable, observable} from 'mobx'
import {RemoteObjectInfo, LocalObjectInfo} from './priorityTypes'
import {priorityLog, PRIORITYLOG} from '@models/utils'

function getIdFromProducer(p: RemoteProducer){
  if (p.role === 'avatar') return p.peer.peer
  return p.role
}

function extractRemoteObjectInfo(producer: RemoteProducer): RemoteObjectInfo|undefined {
  if (producer.role === 'avatar'){
    const participant = participants.getRemote(producer.peer.peer)!
    return participant ? {
      id: producer.peer.peer,
      producer,
      onStage : producer.kind === 'audio' &&
        (participant.physics.onStage || participants.yarnPhones.has(participant.id) || participant.inLocalsZone),
      pose: {
        ...participant.pose,
      },
      size: [0, 0],
      offset: 0,
      priority : 0,
      muted: producer.kind === 'audio' ? participant.muteAudio : participant.muteVideo
    } : undefined
  }else if(producer.role === 'mainScreen'){
    return {
      id: producer.role,
      producer,
      onStage : true,
      pose: {position:[0, 0], orientation: 0},
      size: [0, 0],
      offset: -PARTICIPANT_SIZE * 100,
      priority : 0,
      muted: false,
    }
  }else{
    const content = contents.find(producer.role)!
    return content ? {
      id:producer.role,
      producer,
      onStage : false,
      pose: {
        ...content.pose,
      },
      size: content.size,
      offset: producer.kind==='video' ? -PARTICIPANT_SIZE * 10 : 0,
      priority : 0,
      muted: false,
    } : undefined
  }
}

function extractLocalObjectInfo(participant: LocalParticipant): LocalObjectInfo {
  return {
    id: participant.id,
    pose: {
      ...participant.pose,
    },
    onStage: false,
  }
}

export interface VideoAudioTrackInfo{
  videos: RemoteObjectInfo[]
  audios: RemoteObjectInfo[]
}
export function videoAudioTrackInfoDiff(a:VideoAudioTrackInfo, b:VideoAudioTrackInfo){
  return {
    videos: a.videos.filter(a => !b.videos.find(b => a.id === b.id)),
    audios: a.audios.filter(a => !b.audios.find(b => a.id === b.id)),
  }
}
export function trackInfoMerege(va:VideoAudioTrackInfo){
  return [...va.audios, ...va.videos]
}

export class PriorityCalculator {
  // props cache
  private local: LocalObjectInfo

  // batch update
  private updateAll = true      // true when local participant is changed
  private readonly updateSet = new Set<string>() // store changed remote participant
  private limits = [-1, -1]     // limits on maximum numbers of remote video and audio tracks.
  private limitUpdated = false  // true when local participant.remoteVideoLimit orremoteAudioLimit changes

  // priority cache
  private readonly priorityMaps = [new Map<string, RemoteObjectInfo>(), new Map<string, RemoteObjectInfo>()]
  lastContentVideos: string[] = []
  lastParticipantVideos: string[] = []
  lastAudios: string[] = []

  // list of observable track info lists
  @observable.ref tracksToConsume:VideoAudioTrackInfo = {videos:[], audios:[]}

  private disposers: IReactionDisposer[] = []
  private _enabled = false

  private conference: Conference
  constructor(conf:Conference) {
    const recalculateInterval = 500
    this.conference = conf
    let intervalHandle: number | undefined = undefined
    this.conference.rtcTransports.addListener('connect', ()=>{
      this.enable()
      intervalHandle = window.setInterval(
        () => {this.update()},
        recalculateInterval,
      )
    })
    this.conference.rtcTransports.addListener('disconnect', ()=>{
      this.clear()
      if (intervalHandle !== undefined) {
        window.clearInterval(intervalHandle)
      }
    })
    autorun(() => {
      const local = participants.local
      this.setLimits([local.remoteVideoLimit, local.remoteAudioLimit])
    })

    this.local = extractLocalObjectInfo(participants.local)
    makeObservable(this)
  }

  public clear(){
    this.disable()
    this.updateAll = true
    this.updateSet.clear()
    this.priorityMaps.forEach(m => m.clear())
    this.tracksToConsume = {videos:[],audios:[]}
    this.lastContentVideos = []
    this.lastParticipantVideos = []
    this.lastAudios = []
  }

  public setLimits(limits:number[]):void {
    this.limits[0] = limits[0]
    this.limits[1] = limits[1]
    this.limitUpdated = true
  }

  private UPDATE_INTERVAL = 500
  private intervalId:number = 0
  // start observing participants store
  public enable() {
    // track local change
    const localChangeDisposer = autorun(() => {
      const local = participants.local
      this.local = extractLocalObjectInfo(local)
      this.updateAll = true
    })
    this.disposers = [localChangeDisposer]
    this.intervalId = window.setInterval(()=>{this.update()}, this.UPDATE_INTERVAL)
    this.updateAll = true
    this._enabled = true
  }

  // stop observing participants store
  public disable() {
    window.clearInterval(this.intervalId)
    this.intervalId = 0
    this.disposers.forEach(disposer => disposer())

    this._enabled = false
  }

  // update lastPriority
  private update() {
    if (!this.haveUpdates) { return }

    this.calcPriority()

    this.updateAll = false
    this.updateSet.clear()
    this.limitUpdated = false
  }

  private calcPriority() {
    //  list remote peers
    const producersForMainScreen: RemoteProducer[] = []
    this.conference.remotePeers.forEach(peer => {
      for(const producer of peer.producers){
        const id = getIdFromProducer(producer)
        if (this.updateAll || this.updateSet.has(id)){
          if (producer.role === 'mainScreen'){
            //  Do nothing here for mainScreen. add later.
            producersForMainScreen.push(producer)
          }else{
            const objInfo = extractRemoteObjectInfo(producer)
            if (objInfo){
              objInfo.priority = this.calcPriorityValue(this.local, objInfo)
              this.priorityMaps[producer.kind === 'video' ? 0 : 1].set(id, objInfo)
            }
          }
        }
      }
    })

    //  update prioritizedTrackLists
    const prioritizedTrackInfoLists = this.priorityMaps.map(priorityMap =>
      Array.from(priorityMap.values()).sort((a, b) => a.priority - b.priority)
    ) as [RemoteObjectInfo[], RemoteObjectInfo[]]

    //  add main tracks
    for(const producer of producersForMainScreen){
      const info = extractRemoteObjectInfo(producer)
      if (info){
        prioritizedTrackInfoLists[producer.kind === 'video' ? 0 : 1].unshift(info)
        this.conference.removeLocalTrackByRole(true, 'mainScreen')
      }
    }

    //  limit length
    const videos = prioritizedTrackInfoLists[0].filter(info => !info.muted)
    if (this.limits[0] >= 0 && videos.length > this.limits[0]) videos.length = this.limits[0]
    const audios = prioritizedTrackInfoLists[1].filter(info => !info.muted)
    if (this.limits[1] >= 0 && audios.length > this.limits[1]) audios.length = this.limits[1]

    //  done
    this.tracksToConsume = {videos, audios}
    if (PRIORITYLOG()){
      const vstrs = videos.map(i => i.producer.role==='avatar' ? 'p:' + i.producer.peer.peer : 'c:'+i.producer.role)
      const astrs = audios.map(i => i.producer.role==='avatar' ? 'p:' + i.producer.peer.peer : 'c:'+i.producer.role)
      console.log(`Priority: video=${vstrs} audio=${astrs}`)
    }
  }

  // lower value means higher priority
  private calcPriorityValue(local: LocalObjectInfo, remote: RemoteObjectInfo): number {
    if (remote.onStage) { return 0 }
    const delta = remote.size.map((sz, idx) => {
      let diff:number = remote.pose.position[idx] - local.pose.position[idx]
      if (diff < 0) {
        diff += sz
        if (diff > 0) { diff = 0 }
      }

      return diff
    })
    const distance = Math.sqrt(delta[0] * delta[0] + delta[1] * delta[1]) + remote.offset

    return distance
  }

  private get haveUpdates(): boolean {
    return this.updateAll || this.updateSet.size !== 0 || this.limitUpdated
  }


  private remoteDisposers = new Map<string, IReactionDisposer>()
  public onRemoveProducer(producer: RemoteProducer){
    const others = producer.peer.producers.filter(p => p.role === producer.role)
    const id = getIdFromProducer(producer)
    const index = producer.kind === 'audio' ? 1 : 0
    this.priorityMaps[index].delete(id)

    if (others.length === 0){ //  remove
      if (id !== 'mainScreen'){
        this.onRemoveObject(id)
      }
    }else{
      this.updateSet.add(id)
    }
  }
  private onRemoveObject(id: string){
    const disposer = this.remoteDisposers.get(id)
    if (disposer) {
      disposer()
    }else{
      priorityLog()(`Cannot find disposer for remote object with id: ${id}`)
    }
    this.remoteDisposers.delete(id)
    this.updateSet.add(id)
    priorityLog()('onRemoveObject:', id, this.priorityMaps[0])
  }
  public onAddProducer(producer: RemoteProducer){
    const id = getIdFromProducer(producer)
    if (this.remoteDisposers.has(id)){
      this.updateSet.add(id)
    }else{
      if (producer.role === 'avatar'){
        this.remoteDisposers.set(id, autorun(() => {
          const rp = participants.remote.get(id)
          if (rp){
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const important = rp.physics.onStage || participants.yarnPhones.has(rp.id)
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const moved = rp.pose.position
            this.updateSet.add(id)
          }
        }))
      }else if (producer.role === 'mainScreen') {
        this.updateSet.add(id)
      }else {  //  contents
        this.remoteDisposers.set(id, autorun(() => {
          const c = contents.roomContents.get(id)
          if (isContentRtc(c)){
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const moved = c!.pose.position
          }
          this.updateSet.add(id)
        }))
      }
    }
  }
}
