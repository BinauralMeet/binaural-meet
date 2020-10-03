import {ImageAvatar} from '@components/avatar/ImageAvatar'
import {useStore as useMapStore} from '@hooks/MapStore'
import {useStore as useParticipantsStore} from '@hooks/ParticipantsStore'
import {MapData} from '@stores/MapObject/MapData'
import {ParticipantBase} from '@stores/participants/ParticipantBase'
import {RemoteParticipant} from '@stores/participants/RemoteParticipant'
import {useObserver} from 'mobx-react-lite'
import React from 'react'
import {subV} from 'react-use-gesture'
import {styleForList} from '../utils/styles'

const height = 20
const fontSize = 16

export const ParticipantLine: React.FC<{participant: ParticipantBase, map: MapData}> = (props) => {
  const name = useObserver(() => props.participant.information.name)
  const colors = props.participant.getColor()
  const classes = styleForList({height, fontSize})

  return <div className={classes.line} style={{backgroundColor:colors[0], color:colors[1]}}
  onClick={event => props.map.focusOn(props.participant)}>
    <ImageAvatar information={props.participant.information} color={colors[0]}
      textColor={colors[1]} size={fontSize} style={{flexShrink: 0}} />
    &nbsp; <div>{name}</div>
  </div>
}

export const ParticipantList: React.FC = () => {
  const store = useParticipantsStore()
  const map = useMapStore()
  const classes = styleForList({height, fontSize})
  const localId = useObserver(() => store.localId)
  const ids = useObserver(() => Array.from(store.remote.keys()))
  const dists = new Map<string, number>()
  for (const p of store.remote) {
    const v = subV(p[1].pose.position, store.local.get().pose.position)
    const d = v[0] * v[0] + v[1] * v[1]
    dists.set(p[0], d)
  }

  ids.sort((a, b) => {
    const da = dists.get(a) as number
    const db = dists.get(b) as number

    return da - db
  })

  const remoteElements = ids.map(id =>
    <ParticipantLine key={id} participant={store.remote.get(id) as RemoteParticipant} map={map} />)
  const localElement = (<ParticipantLine key={localId} participant={store.local.get()} map={map} />)

  return (
    <div className={classes.container} >
      <div className={classes.title}>People</div>
      {localElement}{remoteElements}
    </div>
  )
}
ParticipantList.displayName = 'ParticipantList'
