import {Participant, PARTICIPANT_SIZE} from '@models/Participant'
import {urlParameters} from '@models/url'
import {useObserver} from 'mobx-react-lite'
import React, { useEffect } from 'react'
import {MemoedLocalParticipant as LocalParticipant} from './LocalParticipant'
import {MouseCursor} from './MouseCursor'
import {PlaybackParticipant} from './PlaybackParticipant'
import {RemoteParticipant} from './RemoteParticipant'
import { participants } from '@stores/'
import { VRMAvatars, applyMPLandmarkToVrm, updateVrmAvatar} from '@models/utils/vrm'
import { autorun } from 'mobx'
import { extractVrmRig, applyVrmRig} from '@models/utils/vrmIK'

interface LineProps {
  start: [number, number]
  end: [number, number]
  remote: string,
}

const Line: React.FC<LineProps> = (props) => {
  const left = Math.min(props.start[0], props.end[0])
  const top = Math.min(props.start[1], props.end[1])
  const width = Math.abs(props.start[0] - props.end[0])
  const height = Math.abs(props.start[1] - props.end[1])

  return <svg xmlns="http://www.w3.org/2000/svg" style={{position:'absolute', left, top, width, height, pointerEvents:'stroke'}}
    viewBox={`0, 0, ${width}, ${height}`}
    onClick = {() => {
      participants.yarnPhones.delete(props.remote)
      participants.yarnPhoneUpdated = true
    }}
    >
    <line x1={props.start[0] - left} y1={props.start[1] - top}
      x2={props.end[0] - left} y2={props.end[1] - top} stroke="black" />
  </svg>
}


export const ParticipantLayer: React.FC<{vrmAvatars:VRMAvatars}> = (props) => {
  const remotes = useObserver(() => {
    const rs = Array.from(participants.remote.values()).filter(r => r.physics.located)
    const all:Participant[] = Array.from(rs)
    all.push(participants.local)
    all.sort((a,b) => a.pose.position[1] - b!.pose.position[1])
    for(let i=0; i<all.length; ++i){
      all[i].zIndex = i+1
    }
    //rs.sort((a,b) => a.pose.position[1] - b!.pose.position[1])
    return rs
  })
  const localId = useObserver(() => participants.localId)
  const remoteElements = remotes.map((r, index) => <RemoteParticipant key={r.id}
    participant={r} size={PARTICIPANT_SIZE} zIndex={index} />)
  const localElement = (<LocalParticipant key={'local'} participant={participants.local}
    size={PARTICIPANT_SIZE} />)
  const lines = useObserver(
    () => Array.from(participants.yarnPhones).map((rid) => {
      const start = participants.local.pose.position
      const remote = participants.remote.get(rid)
      if (!remote) { return undefined }
      const end = remote.pose.position

      return <Line start={start} end={end} key={rid} remote={rid}/>
    }),
  )
  const playIds = useObserver(()=> Array.from(participants.playback.keys()))
  const playbackElements = playIds.map((id, index) => <PlaybackParticipant key={id}
    participant={participants.playback.get(id)!} size={PARTICIPANT_SIZE} zIndex={index}/>)

  const mouseIds = useObserver(() => Array.from(participants.remote.keys()).filter(id => (participants.find(id)!.mouse.show)))
  const remoteMouseCursors = mouseIds.map(
    id => <MouseCursor key={`M_${id}`} participantId={id}/>)

  const showLocalMouse = useObserver(() => participants.local.mouse.show)
  const localMouseCursor = showLocalMouse
    ? <MouseCursor key={'M_local'} participantId={localId} /> : undefined

  if (urlParameters.testBot !== null) { return <div /> }

  useEffect(()=>{
    //  console.log('ParticipantLayer mount')
    const vas = props.vrmAvatars
    if (!vas) return
    const dispoLocalApplyMediaPipe = autorun(()=>{
      if (vas.local){
        //console.log(`Set pose to VRM avatar for local ${participants.localId}.`)
        applyMPLandmarkToVrm(vas.local, participants.local.landmarks)
        participants.local.vrmRig = extractVrmRig(vas.local, participants.local.landmarks)
      }
    })
    const dispoLocal = autorun(()=>{
      //  console.log(`autorun for Local avatar ${participants.local.information.avatarSrc.substring(participants.local.information.avatarSrc.lastIndexOf('/'))}`)
      if (participants.local.isVrm() && participants.localId){
        updateVrmAvatar(vas.local, participants.local).then(avatar => {
          if(!vas.local) vas.local = avatar
          avatar.dispo = ()=>{
            dispoLocal()
            dispoLocalApplyMediaPipe()
          }
        })
      }
    })
    const dispo = autorun(()=>{
      for(const remote of participants.remote.values()){
        if (!vas.remotes.has(remote.id)){
          const dispoRemoteApplyRig = autorun(()=>{
            if (remote.vrmRig){
              const rav = vas.remotes.get(remote.id)
              if (rav && rav.vrm){
                //console.log(`Set pose to VRM avatar for remote ${remote.id}.`)
                applyVrmRig(rav.vrm, remote.vrmRig)
              }
            }
          })
          const dispoRemote = autorun(()=>{
            //  console.log(`autorun for remote vrm avatar of ${info.name}`)
            if(remote.hasVrm() && participants.local.showVrm()){
              const rav = vas.remotes.get(remote.id)
              updateVrmAvatar(rav, remote).then(avatar => {
                if (!rav) vas.remotes.set(remote.id, avatar)
                avatar.dispo = ()=>{
                  dispoRemoteApplyRig()
                  dispoRemote()
                }
              })
            }
          })
        }
      }
      for(const pid of vas.remotes.keys()){
        if(!participants.remote.has(pid)){
          vas.delete(false, pid)
        }
      }
    })
    return ()=>{
      //  console.log('ParticipantLayer unmount')
      dispo()
      if (vas){
        for(const pid of vas.remotes.keys()){
          vas.delete(false, pid)
        }
        if (vas.local){
          vas.delete(true)
        }
        vas.remotes.clear()
        vas.local = undefined
      }
    }
  }, [props.vrmAvatars])

  //  zIndex is needed to show the participants over the share layer.
  return(
    <div style={{position:'absolute', zIndex:0x7FFF}}>
      {lines}
      {playbackElements}
      {remoteElements}
      {localElement}
      {remoteMouseCursors}
      {localMouseCursor}
    </div>
  )
}

ParticipantLayer.displayName = 'ParticipantsLayer'
