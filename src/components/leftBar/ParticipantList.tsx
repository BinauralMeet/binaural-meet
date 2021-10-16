import {ImageAvatar} from '@components/avatar/ImageAvatar'
import {LocalParticipantForm} from '@components/map/ParticipantsLayer/LocalParticipantForm'
import {RemoteParticipantForm} from '@components/map/ParticipantsLayer/RemoteParticipantForm'
import {Tooltip} from '@material-ui/core'
import Button from '@material-ui/core/Button'
import IconButton from '@material-ui/core/IconButton'
import {connection} from '@models/api'
import { MessageType } from '@models/api/MessageType'
import {getColorOfParticipant} from '@models/Participant'
import {isDarkColor} from '@models/utils'
import {ParticipantBase} from '@stores/participants/ParticipantBase'
import roomInfo from '@stores/RoomInfo'
import {autorun} from 'mobx'
import {useObserver} from 'mobx-react-lite'
import React from 'react'
import {Stores} from '../utils'
import {styleForList} from '../utils/styles'
import {TextLineStyle} from './LeftBar'
import {StatusDialog} from './StatusDialog'

// config.js
declare const config:any             //  from ../../config.js included from index.html

export const ParticipantLine: React.FC<TextLineStyle&Stores&{participant: ParticipantBase}> = (props) => {
  const name = useObserver(() => (props.participant.information.name))
  const avatarSrc = useObserver(() => (props.participant.information.avatarSrc))
  const colors = useObserver(() => getColorOfParticipant(props.participant.information))
  const size = useObserver(() => props.lineHeight)
  const classes = styleForList({height:props.lineHeight, fontSize:props.fontSize})
  const [showForm, setShowForm] = React.useState(false)
  const ref = React.useRef<HTMLButtonElement>(null)
  const {lineHeight, ...propsForForm} = props
  //  console.log(`PColor pid:${props.participant.id} colors:${colors}`, props.participant)
  function onClick(){
    if (props.participant.physics.located){
      props.map.focusOn(props.participant)
    }else{
      if(config.bmRelayServer){
        connection.conference.pushOrUpdateMessageViaRelay(
          MessageType.REQUEST_PARTICIPANT_STATES, [props.participant.id])
      }
      const disposer = autorun(()=>{
        if (props.participant.physics.located){
          props.map.focusOn(props.participant)
          disposer()
        }
      })
    }
  }
  function onContextMenu(){
    if (props.participant.physics.located){
      setShowForm(true)
      props.map.keyInputUsers.add('participantList')
    }else{
      if(config.bmRelayServer){
        connection.conference.pushOrUpdateMessageViaRelay(
          MessageType.REQUEST_PARTICIPANT_STATES, [props.participant.id])
      }
      const disposer = autorun(()=>{
        if (props.participant.physics.located){
          setShowForm(true)
          props.map.keyInputUsers.add('participantList')
          disposer()
        }
      })
    }
  }

  return <>
    <Tooltip title={props.participant.id} placement="right">
      <div className={classes.outer} style={{margin:'1px 0 1px 0'}}>
        <IconButton style={{margin:0, padding:0}} onClick={onClick} onContextMenu={onContextMenu}>
          <ImageAvatar border={true} colors={colors} size={size} name={name} avatarSrc={avatarSrc} />
        </IconButton>
        <Button variant="contained" className={classes.line} ref={ref}
          style={{backgroundColor:colors[0], color:colors[1]}}
          onClick={onClick} onContextMenu={onContextMenu}>
            {name}
        </Button>
      </div>
    </Tooltip>
    {props.participant.id === props.participants.localId ?
      <LocalParticipantForm map={props.map} open={showForm} close={()=>{
        setShowForm(false)
        props.map.keyInputUsers.delete('participantList')
      }} anchorEl={ref.current} anchorOrigin={{vertical:'top', horizontal:'right'}} /> :
      <RemoteParticipantForm {...propsForForm} open={showForm} close={()=>{
        setShowForm(false)
        props.map.keyInputUsers.delete('participantList')
      }} participant={props.participants.remote.get(props.participant.id)}
        anchorEl={ref.current} anchorOrigin={{vertical:'top', horizontal:'right'}} />
    }
  </>
}

export const RawParticipantList: React.FC<Stores&TextLineStyle&{localId: string, remoteIds: string[]}> = (props) => {
  const [showStat, setShowStat] = React.useState(false)
  const store = props.participants
  const classes = styleForList({height: props.lineHeight, fontSize: props.fontSize})
  const {localId, remoteIds, lineHeight, fontSize, ...statusProps} = props
  const lineProps = {lineHeight, fontSize, ...statusProps}
  const textColor = useObserver(() => isDarkColor(roomInfo.backgroundFill) ? 'white' : 'black')

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
    <ParticipantLine key={id}
      participant={store.remote.get(id)!}
      {...lineProps} />)
  const localElement = (<ParticipantLine key={localId} participant={store.local} {...lineProps} />)
  const ref = React.useRef<HTMLDivElement>(null)

  return (
    <div className={classes.container} >
      <div className={classes.title} style={{color:textColor}} ref={ref}
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
