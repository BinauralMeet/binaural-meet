import {ImageAvatar} from '@components/avatar/ImageAvatar'
import {Tooltip} from '@material-ui/core'
import {connection} from '@models/api/Connection'
import {MapData} from '@stores/Map'
import {ParticipantBase} from '@stores/participants/ParticipantBase'
import {RemoteParticipant} from '@stores/participants/RemoteParticipant'
import {useObserver} from 'mobx-react-lite'
import React from 'react'
import {Stores} from '../utils'
import {styleForList} from '../utils/styles'

const height = 20
const fontSize = 16

export const ParticipantLine: React.FC<{participant: ParticipantBase, map: MapData}> = (props) => {
  const info = useObserver(() => (Object.assign({}, props.participant.information)))
  const colors = props.participant.getColor()
  const classes = styleForList({height, fontSize})

  return <Tooltip title={props.participant.id} placement="right">
    <div className={classes.line} style={{backgroundColor:colors[0], color:colors[1]}}
    onClick={() => props.map.focusOn(props.participant)}>
      <ImageAvatar information={info} color={colors[0]}
        textColor={colors[1]} size={fontSize} style={{flexShrink: 0}} />
      &nbsp; <div>{info.name}</div>
    </div>
  </Tooltip>
}

export const RawParticipantList: React.FC<Stores&{localId: string, remoteIds: string[]}> = (props) => {
  const store = props.participants
  const map = props.map
  const classes = styleForList({height, fontSize})
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
    <ParticipantLine key={id} participant={store.remote.get(id) as RemoteParticipant} map={map} />)
  const localElement = (<ParticipantLine key={localId} participant={store.local} map={map} />)

  return (
    <div className={classes.container} >
      <div className={classes.title}>{(store.remote.size + 1).toString()} in {connection.conferenceName}</div>
      {localElement}{remoteElements}
    </div>
  )
}
RawParticipantList.displayName = 'ParticipantList'

export const ParticipantList = React.memo<Stores>(
  (props) => {
    const localId = useObserver(() => props.participants.localId)
    const ids = useObserver(() => Array.from(props.participants.remote.keys()))

    return <RawParticipantList {...props} localId={localId} remoteIds = {ids} />
  },
)
