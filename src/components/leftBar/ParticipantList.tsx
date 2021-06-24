import {ImageAvatar} from '@components/avatar/ImageAvatar'
import {Tooltip} from '@material-ui/core'
import {ParticipantBase} from '@stores/participants/ParticipantBase'
import {RemoteParticipant} from '@stores/participants/RemoteParticipant'
import {Room} from '@stores/Room'
import {useObserver} from 'mobx-react-lite'
import React from 'react'
import {styleForList} from '../utils/styles'
import {TextLineStyle} from './LeftBar'
import { StatusDialog } from './StatusDialog'

export const ParticipantLine: React.FC<TextLineStyle&{room: Room}&{participant: ParticipantBase}> = (props) => {
  const name = useObserver(() => (props.participant.information.name))
  const avatarSrc = useObserver(() => (props.participant.information.avatarSrc))
  const colors = useObserver(() => props.participant.getColor())
  const size = useObserver(() => props.lineHeight)
  const classes = styleForList({height:props.lineHeight, fontSize:props.fontSize})

  return <>
    <Tooltip title={props.participant.id} placement="right">
      <div className={classes.outer} >
        <ImageAvatar border={true} colors={colors} size={size * 1.05}
          name={name} avatarSrc={avatarSrc} />
        <div className={classes.line} style={{backgroundColor:colors[0], color:colors[1], width:'100%'}}>
          {name}
        </div>
      </div>
    </Tooltip>
  </>
}

export const RawParticipantList:
  React.FC<TextLineStyle&{room: Room, localId: string, remoteIds: string[]}> = (props) => {
  const [showStat, setShowStat] = React.useState(false)
  const store = props.room.participants
  const classes = styleForList({height: props.lineHeight, fontSize: props.fontSize})
  const {localId, remoteIds, lineHeight, fontSize, ...statusProps} = props
  remoteIds.sort((a, b) => {
    const pa = store.remote.get(a)
    const pb = store.remote.get(b)
    let rv = pa!.information.name.localeCompare(pb!.information.name, undefined, {sensitivity: 'accent'})
    if (rv === 0) {
      rv = (pa!.information.avatarSrc || '').localeCompare(pb!.information.avatarSrc || '', undefined, {sensitivity: 'accent'})
    }

    return rv
  })
  const remoteElements = remoteIds.map(id =>
    <ParticipantLine key={id} participant={store.remote.get(id) as RemoteParticipant} {...props} />)
  const ref = React.useRef<HTMLDivElement>(null)

  return (
    <div className={classes.container} >
      <div className={classes.title} ref={ref}>
        <span onClick={()=>{setShowStat(true)}}>{(store.remote.size).toString()} in </span>
        <a href={`https://binaural.me/?room=${props.room.name}`}>
          {props.room.name}</a>
      </div>
      <StatusDialog open={showStat}
        close={()=>{setShowStat(false)}} {...statusProps} anchorEl={ref.current}/>
      {remoteElements}
    </div>
  )
}
RawParticipantList.displayName = 'ParticipantList'

export const ParticipantList = React.memo<{room: Room}&TextLineStyle>(
  (props) => {
    const localId = useObserver(() => props.room.participants.localId)
    const ids = useObserver(() => Array.from(props.room.participants.remote.keys()))

    return <RawParticipantList {...props} localId={localId} remoteIds = {ids} />
  },
)
