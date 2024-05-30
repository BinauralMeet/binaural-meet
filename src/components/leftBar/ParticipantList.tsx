import {ImageAvatar} from '@components/avatar/ImageAvatar'
import {LocalParticipantForm} from '@components/map/Participant/LocalParticipantForm'
import {RemoteParticipantForm} from '@components/map/Participant/RemoteParticipantForm'
import {Tooltip} from '@material-ui/core'
import Button from '@material-ui/core/Button'
import IconButton from '@material-ui/core/IconButton'
import {conference} from '@models/conference'
import {MessageType} from '@models/conference/DataMessageType'
import {getColorOfParticipant} from '@models/Participant'
import {isDarkColor} from '@models/utils'
import {ParticipantBase} from '@stores/participants/ParticipantBase'
import {autorun} from 'mobx'
import {Observer, useObserver} from 'mobx-react-lite'
import React, { CSSProperties } from 'react'
import {styleForList} from '../utils/styles'
import {TextLineStyle} from './LeftBar'
import {StatusDialog} from './StatusDialog'
import RecordIcon from '@material-ui/icons/FiberManualRecord'
import SpeakerOffIcon from '@material-ui/icons/VolumeOff'
import MicOffIcon from '@material-ui/icons/MicOff'
import {Icon} from '@iconify/react'
import megaphoneIcon from '@iconify/icons-mdi/megaphone'
import {t} from '@models/locales'
import {participants, map, roomInfo} from '@stores/'

export const ParticipantLine: React.FC<TextLineStyle&{participant: ParticipantBase}> = (props) => {
  const name = useObserver(() => (props.participant.information.name))
  const avatarSrc = useObserver(() => (props.participant.information.avatarSrc))
  const colors = useObserver(() => getColorOfParticipant(props.participant.information))
  const size = useObserver(() => props.lineHeight)
  const classes = styleForList({height:props.lineHeight, fontSize:props.fontSize})
  const [showForm, setShowForm] = React.useState(false)
  const ref = React.useRef<HTMLButtonElement>(null)
  const {lineHeight, ...propsForForm} = props

  const iconL:CSSProperties = {
    position: 'absolute',
    width: 0.6 * lineHeight,
    height: 0.6 * lineHeight,
    left: -0.1 * lineHeight,
    top: 0.5 * lineHeight,
    pointerEvents: 'none',
  }
  const iconR:CSSProperties = {
    position: 'absolute',
    width: 0.6 * lineHeight,
    height: 0.6 * lineHeight,
    left: 0.5 * lineHeight,
    top: 0.5 * lineHeight,
    pointerEvents: 'none',
  }

  //  console.log(`PColor pid:${props.participant.id} colors:${colors}`, props.participant)
  function onClick(){
    if (props.participant.physics.located){
      map.focusOn(props.participant)
    }else{
      conference.dataConnection.sendMessage(
        MessageType.REQUEST_PARTICIPANT_STATES, [props.participant.id])
      const disposer = autorun(()=>{
        if (props.participant.physics.located){
          map.focusOn(props.participant)
          disposer()
        }
      })
    }
  }
  function onContextMenu(){
    if (props.participant.physics.located){
      setShowForm(true)
      map.keyInputUsers.add('participantList')
    }else{
      conference.dataConnection.sendMessage(
        MessageType.REQUEST_PARTICIPANT_STATES, [props.participant.id])
      const disposer = autorun(()=>{
        if (props.participant.physics.located){
          setShowForm(true)
          map.keyInputUsers.add('participantList')
          disposer()
        }
      })
    }
  }

  return <Observer>{()=> <>
    <Tooltip title={`${props.participant.information.name} (${props.participant.id})`} placement="right">
      <div className={classes.outer} style={{margin:'1px 0 1px 0'}}>
        <IconButton style={{margin:0, padding:0}} onClick={onClick} onContextMenu={onContextMenu}>
          <ImageAvatar border={true} colors={colors} size={size} name={name} avatarSrc={avatarSrc} />
          {props.participant.recording ? <RecordIcon style={iconL} htmlColor="#D00"/> : undefined }
          {props.participant.muteSpeaker ? <SpeakerOffIcon style={iconR} color="secondary"/> :
            props.participant.muteAudio ? <MicOffIcon style={iconR} color="secondary"/> : undefined }
          {props.participant.physics.onStage ? <Icon style={iconR} icon={megaphoneIcon} color="gold" />: undefined}
        </IconButton>
        <Button variant="contained" className={classes.line} ref={ref}
          style={{backgroundColor:colors[0], color:colors[1], textTransform:'none', padding:0}}
          onClick={onClick} onContextMenu={onContextMenu}>
            <span className={classes.line}>{name}</span>
        </Button>
      </div>
    </Tooltip>
    {props.participant.id === participants.localId ?
      <LocalParticipantForm open={showForm} close={()=>{
        setShowForm(false)
        map.keyInputUsers.delete('participantList')
      }} anchorEl={ref.current} anchorOrigin={{vertical:'top', horizontal:'right'}} /> :
      <RemoteParticipantForm {...propsForForm} open={showForm} close={()=>{
        setShowForm(false)
        map.keyInputUsers.delete('participantList')
      }} participant={participants.remote.get(props.participant.id)}
        anchorEl={ref.current} anchorOrigin={{vertical:'top', horizontal:'right'}} />
    }
  </>}</Observer>
}

export const RawParticipantList: React.FC<TextLineStyle&{localId: string, remoteIds: string[]}> = (props) => {
  const [showStat, setShowStat] = React.useState(false)
  const classes = styleForList({height: props.lineHeight, fontSize: props.fontSize})
  const {localId, remoteIds, lineHeight, fontSize, ...statusProps} = props
  const lineProps = {lineHeight, fontSize, ...statusProps}

  remoteIds.sort((a, b) => {
    const pa = participants.remote.get(a)
    const pb = participants.remote.get(b)
    let rv = pa!.information.name.localeCompare(pb!.information.name, undefined, {sensitivity: 'accent'})
    if (rv === 0) {
      rv = (pa!.information.avatarSrc || '').localeCompare(pb!.information.avatarSrc || '', undefined, {sensitivity: 'accent'})
    }

    return rv
  })
  const remoteElements = remoteIds.map(id =>
    <ParticipantLine key={id}
      participant={participants.remote.get(id)!}
      {...lineProps} />)
  const localElement = (<ParticipantLine key={localId} participant={participants.local} {...lineProps} />)
  const ref = React.useRef<HTMLDivElement>(null)

  const icon:CSSProperties = {
    //position: 'absolute',
    width: lineHeight,
    height: lineHeight,
    lineHeight: 0.4*lineHeight,
    margin:0,
    verticalAlign:'bottom'
  }


  return <Observer>{()=> {
    const textColor = isDarkColor(roomInfo.backgroundFill) ? 'white' : 'black'
    let recording = participants.local.recording
    participants.remote.forEach(p => {recording ||= p.recording})

    return <div className={classes.container} >
      <div className={classes.title} style={{color:textColor}} ref={ref}
        onClick={()=>{setShowStat(true)}}
      >
        {recording ?
          <Tooltip title={t('ttBeingRecorded')}>
            <RecordIcon htmlColor='#D00' style={icon}/>
          </Tooltip> : undefined}
        {(participants.remote.size + 1).toString()} in {conference.room}</div>
      <StatusDialog open={showStat}
        close={()=>{setShowStat(false)}} {...statusProps} anchorEl={ref.current}/>
      {localElement}{remoteElements}
    </div>
  }}</Observer>
}
RawParticipantList.displayName = 'ParticipantList'

export const ParticipantList = React.memo<TextLineStyle>(
  (props) => {
    const localId = useObserver(() => participants.localId)
    const ids = useObserver(() => Array.from(participants.remote.keys()))

    return <RawParticipantList {...props} localId={localId} remoteIds = {ids} />
  },
)
