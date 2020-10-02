import {ImageAvatar} from '@components/avatar/ImageAvatar'
import {useStore as useMapStore} from '@hooks/MapStore'
import {useStore as useParticipantsStore} from '@hooks/ParticipantsStore'
import {makeStyles} from '@material-ui/core'
import {MapData} from '@stores/MapObject/MapData'
import {ParticipantBase} from '@stores/participants/ParticipantBase'
import {RemoteParticipant} from '@stores/participants/RemoteParticipant'
import {useObserver} from 'mobx-react-lite'
import React from 'react'
import {subV} from 'react-use-gesture'

const height = 20
const fontSize = 16
const useStylesLine = makeStyles({
  line: {
    display: 'flex',
    justifyContent: 'start',
    justifyItems: 'start',
    alignItems: 'center',
    userSelect: 'none',
    userDrag: 'none',
    whiteSpace: 'nowrap',
    fontSize,
    height,
    width: '100%',
    margin: '1px 0 1px 0',
  },
})

export const ParticipantLine: React.FC<{participant: ParticipantBase, map: MapData}> = (props) => {
  const name = useObserver(() => props.participant.information.name)
  const classes = useStylesLine()
  const colors = props.participant.getColor()

  return <div className={classes.line} style={{backgroundColor:colors[0], color:colors[1]}}
    onClick={(event) => {
      const im = props.map.matrix.inverse()
      const diff = subV(props.participant.pose.position, [im.e, im.f])
      const trn = new DOMMatrix().translate(-diff[0], -diff[1])
      const newMat = trn.preMultiplySelf(props.map.matrix)
      props.map.setMatrix(newMat)
      props.map.setCommittedMatrix(newMat)
    }}>
    <ImageAvatar information={props.participant.information} color={colors[0]}
      textColor={colors[1]} size={fontSize} style={{flexShrink: 0}} />
    &nbsp; <div>{name}</div>
  </div>
}


const useStyles = makeStyles({
  container: {
    overflowY: 'auto',
    overflowX: 'hidden',
    height: '100%',
  },
})
export const ParticipantList: React.FC = () => {
  const classes = useStyles()
  const store = useParticipantsStore()
  const map = useMapStore()
  const localId = useObserver(() => store.localId)
  const ids = useObserver(() => Array.from(store.remote.keys()).filter(id => (
    store.find(id)!.perceptibility.visibility
  )))
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
      {localElement}{remoteElements}
    </div>
  )
}
ParticipantList.displayName = 'ParticipantList'
