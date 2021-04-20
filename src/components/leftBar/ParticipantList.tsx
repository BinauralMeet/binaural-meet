import {ImageAvatar} from '@components/avatar/ImageAvatar'
import {Tooltip} from '@material-ui/core'
import {connection} from '@models/api'
import {MapData} from '@stores/Map'
import {ParticipantBase} from '@stores/participants/ParticipantBase'
import {RemoteParticipant} from '@stores/participants/RemoteParticipant'
import {useObserver} from 'mobx-react-lite'
import React from 'react'
import {Stores} from '../utils'
import {styleForList} from '../utils/styles'
import {TextLineStyle} from './LeftBar'


export const ParticipantLine: React.FC<TextLineStyle&{participant: ParticipantBase, map: MapData}> = (props) => {
  const info = useObserver(() => (Object.assign({}, props.participant.information)))
  const colors = useObserver(() => props.participant.getColor())
  const classes = styleForList({height:props.lineHeight, fontSize:props.fontSize})

  return <Tooltip title={props.participant.id} placement="right">
    <div className={classes.outer} onClick={() => props.map.focusOn(props.participant)}>
      <ImageAvatar information={info} color={colors[0]} textColor={colors[1]} size={props.lineHeight}
        style={{flexShrink: 0, width:props.lineHeight, heihgt: props.lineHeight}} />
      <div className={classes.line} style={{backgroundColor:colors[0], color:colors[1], width:'100%'}}>
        {info.name}
      </div>
    </div>
  </Tooltip>
}

export const RawParticipantList: React.FC<Stores&TextLineStyle&{localId: string, remoteIds: string[]}> = (props) => {
  const store = props.participants
  const classes = styleForList({height: props.lineHeight, fontSize: props.fontSize})
  const localId = props.localId
  const ids = props.remoteIds
  ids.sort((a, b) => {
    const pa = store.remote.get(a)
    const pb = store.remote.get(b)
    let rv = pa!.information.name.localeCompare(pb!.information.name, undefined, {sensitivity: 'accent'})
    if (rv === 0) {
      rv = (pa!.information.email || '').localeCompare(pb!.information.email || '', undefined, {sensitivity: 'accent'})
    }

    return rv
  })
  const remoteElements = ids.map(id =>
    <ParticipantLine key={id} participant={store.remote.get(id) as RemoteParticipant} {...props} />)
  const localElement = (<ParticipantLine key={localId} participant={store.local} {...props} />)

  return (
    <div className={classes.container} >
      <div className={classes.title}>{(store.remote.size + 1).toString()} in {connection.conferenceName}</div>
      {localElement}{remoteElements}
    </div>
  )
}
RawParticipantList.displayName = 'ParticipantList'

export const ParticipantList = React.memo<Stores&TextLineStyle>(
  (props) => {
    const localId = useObserver(() => props.participants.localId)
    const ids = useObserver(() => Array.from(props.participants.remote.keys()))

    return <RawParticipantList {...props} localId={localId} remoteIds = {ids} />
  },
)
