import {Stores} from '@components/utils'
import {MapProps } from '@components/utils'
import {PARTICIPANT_SIZE} from '@models/Participant'
import {urlParameters} from '@models/url'
import {useObserver} from 'mobx-react-lite'
import React from 'react'
import {MemoedLocalParticipant as LocalParticipant} from './LocalParticipant'
import {MouseCursor} from './MouseCursor'
import {PlaybackParticipant} from './PlaybackParticipant'
import {RemoteParticipant} from './RemoteParticipant'

interface LineProps {
  start: [number, number]
  end: [number, number]
  remote: string,
  stores: Stores
}

const Line: React.FC<LineProps> = (props) => {
  const left = Math.min(props.start[0], props.end[0])
  const top = Math.min(props.start[1], props.end[1])
  const width = Math.abs(props.start[0] - props.end[0])
  const height = Math.abs(props.start[1] - props.end[1])

  return <svg xmlns="http://www.w3.org/2000/svg" style={{position:'absolute', left, top, width, height, pointerEvents:'stroke'}}
    viewBox={`0, 0, ${width}, ${height}`}
    onClick = {() => {
      props.stores.participants.yarnPhones.delete(props.remote)
      props.stores.participants.yarnPhoneUpdated = true
    }}
    >
    <line x1={props.start[0] - left} y1={props.start[1] - top}
      x2={props.end[0] - left} y2={props.end[1] - top} stroke="black" />
  </svg>
}

export const ParticipantsLayer: React.FC<MapProps> = (props) => {
  const store = props.stores.participants
  const ids = useObserver(() => Array.from(store.remote.keys()).filter((id) => {
    const remote = store.find(id)!

    return remote.physics.located
  }))
  const localId = useObserver(() => store.localId)
  const remoteElements = ids.map(id => <RemoteParticipant key={id} stores={props.stores}
    participant={store.remote.get(id)!} size={PARTICIPANT_SIZE} />)
  const localElement = (<LocalParticipant key={'local'} participant={store.local}
    size={PARTICIPANT_SIZE} stores={props.stores}/>)
  const lines = useObserver(
    () => Array.from(store.yarnPhones).map((rid) => {
      const start = store.local.pose.position
      const remote = store.remote.get(rid)
      if (!remote) { return undefined }
      const end = remote.pose.position

      return <Line start={start} end={end} key={rid} remote={rid} stores={props.stores}/>
    }),
  )
  const playIds = useObserver(()=> Array.from(store.playback.keys()))
  const playbackElements = playIds.map(id => <PlaybackParticipant key={id} stores={props.stores}
    participant={store.playback.get(id)!} size={PARTICIPANT_SIZE} />)

  const mouseIds = useObserver(() => Array.from(store.remote.keys()).filter(id => (store.find(id)!.mouse.show)))
  const remoteMouseCursors = mouseIds.map(
    id => <MouseCursor key={`M_${id}`} participantId={id} stores={props.stores} />)

  const showLocalMouse = useObserver(() => store.local.mouse.show)
  const localMouseCursor = showLocalMouse
    ? <MouseCursor key={'M_local'} participantId={localId}  stores={props.stores} /> : undefined

  if (urlParameters.testBot !== null) { return <div /> }

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

ParticipantsLayer.displayName = 'ParticipantsLayer'
