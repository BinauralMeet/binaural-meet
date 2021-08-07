import {ImageAvatar} from '@components/avatar/ImageAvatar'
import {LocalParticipantForm} from '@components/map/ParticipantsLayer/LocalParticipantForm'
import {RemoteParticipantForm} from '@components/map/ParticipantsLayer/RemoteParticipantForm'
import {Tooltip} from '@material-ui/core'
import {connection} from '@models/api'
import {ParticipantBase} from '@stores/participants/ParticipantBase'
import {RemoteParticipant} from '@stores/participants/RemoteParticipant'
import {useObserver} from 'mobx-react-lite'
import React from 'react'
import {Stores} from '../utils'
import {styleForList} from '../utils/styles'
import {TextLineStyle} from './LeftBar'
import { StatusDialog } from './StatusDialog'

export const ParticipantLine: React.FC<TextLineStyle&Stores&{participant: ParticipantBase}> = (props) => {
  const name = useObserver(() => (props.participant.information.name))
  const avatarSrc = useObserver(() => (props.participant.information.avatarSrc))
  const colors = useObserver(() => props.participant.getColor())
  const size = useObserver(() => props.lineHeight)
  const classes = styleForList({height:props.lineHeight, fontSize:props.fontSize})
  const [showForm, setShowForm] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)
  //  console.log(`PColor pid:${props.participant.id} colors:${colors}`, props.participant)

  return <>
    <Tooltip title={props.participant.id} placement="right">
      <div className={classes.outer} ref={ref}
        onClick={(ev) => { props.map.focusOn(props.participant) }}
        onContextMenu={() => {
          setShowForm(true)
          props.map.keyInputUsers.add('participantList')
        }}>
        <ImageAvatar border={true} colors={colors} size={size * 1.05}
          name={name} avatarSrc={avatarSrc} />
        <div className={classes.line} style={{backgroundColor:colors[0], color:colors[1], width:'100%'}}>
          {name}
        </div>
      </div>
    </Tooltip>
    {props.participant.id === props.participants.localId ?
      <LocalParticipantForm map={props.map} open={showForm} close={()=>{
        setShowForm(false)
        props.map.keyInputUsers.delete('participantList')
      }} anchorEl={ref.current} anchorOrigin={{vertical:'top', horizontal:'right'}} /> :
      <RemoteParticipantForm {...props} open={showForm} close={()=>{
        setShowForm(false)
        props.map.keyInputUsers.delete('participantList')
      }} participant={props.participant as RemoteParticipant}
        anchorEl={ref.current} anchorOrigin={{vertical:'top', horizontal:'right'}} />
    }
  </>
}

export const RawParticipantList: React.FC<Stores&TextLineStyle&{localId: string, remoteIds: string[]}> = (props) => {
  const [showStat, setShowStat] = React.useState(false)
  const store = props.participants
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
  const localElement = (<ParticipantLine key={localId} participant={store.local} {...props} />)
  const ref = React.useRef<HTMLDivElement>(null)

  return (
    <div className={classes.container} >
      <div className={classes.title} ref={ref}
        onClick={()=>{setShowStat(true)}}
      >{(store.remote.size + 1).toString()} in {connection.conference.name}</div>
      <StatusDialog open={showStat}
        close={()=>{setShowStat(false)}} {...statusProps} anchorEl={ref.current}/>
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
