import {BaseProps} from '@components/utils'
import {useStore as useParticipantsStore} from '@hooks/ParticipantsStore'
import Fab from '@material-ui/core/Fab'
import Menu from '@material-ui/core/Menu'
import MenuItem from '@material-ui/core/MenuItem'
import {makeStyles} from '@material-ui/core/styles'
import MoreIcon from '@material-ui/icons/ExpandMore'
import MicIcon from '@material-ui/icons/Mic'
import MicOffIcon from '@material-ui/icons/MicOff'
import ScreenShareIcon from '@material-ui/icons/ScreenShare'
import VideoIcon from '@material-ui/icons/Videocam'
import VideoOffIcon from '@material-ui/icons/VideocamOff'
import SpeakerOnIcon from '@material-ui/icons/VolumeUp'
import SpeakerOffIcon from '@material-ui/icons/VolumeOff'
import {useObserver} from 'mobx-react-lite'
import React from 'react'

const useStyles = makeStyles((theme) => {
  return ({
    box: {
      position: 'absolute',
      bottom: 0,
      opacity: 0.1,
      '&:hover': {
        opacity: 1.0,
      },
    },
    margin: {
      margin: theme.spacing(1),
    },
    small: {
      transform: 'scale(0.5)',
      margin: '1.2em 0 0 -2.1em',
    },
  })
})


export const Footer: React.FC<BaseProps> = (props) => {
  const classes = useStyles()
  const participants = useParticipantsStore()

  const [micMenuEl, setMicMenuEl] = React.useState<Element|null>(null)
  const closeMicMenu = (did:string) => {
    participants.local.get().plugins.streamControl.audioInputDevice = did
    setMicMenuEl(null)
  }
  const [speakerMenuEl, setSpeakerMenuEl] = React.useState<Element|null>(null)
  const closeSpeakerMenu = (did:string) => {
    participants.local.get().plugins.streamControl.audioOutputDevice = did
    setSpeakerMenuEl(null)
  }
  const [videoMenuEl, setVideoMenuEl] = React.useState<Element|null>(null)
  const closeVideoMenu = (did:string) => {
    participants.local.get().plugins.streamControl.videoInputDevice = did
    setVideoMenuEl(null)
  }
  const [deviceInfos, setDeviceInfos] = React.useState<MediaDeviceInfo[]>([])

  const mute = useObserver(() => ({
    muteA: participants.local.get().plugins.streamControl.muteAudio,  //  mic
    muteS: participants.local.get().plugins.streamControl.muteAudio,  //  speaker
    muteV: participants.local.get().plugins.streamControl.muteVideo,  //  camera
  }))
  function gotDevices(di: MediaDeviceInfo[]){
    setDeviceInfos(di)
  }
  const micMenuItems:JSX.Element[] = []
  const speakerMenuItems:JSX.Element[] = []
  const videoMenuItems:JSX.Element[] = []
  deviceInfos.map((info) => {
    if (info.kind === 'audioinput'){
      micMenuItems.push(<MenuItem key={info.deviceId}
        onClick={()=>{closeMicMenu(info.deviceId)}}
        > { info.label }</MenuItem>)
    }
    if (info.kind === 'audiooutput'){
      speakerMenuItems.push(<MenuItem key={info.deviceId}
        onClick={()=>{closeSpeakerMenu(info.deviceId)}}
        > { info.label }</MenuItem>)
    }
    if (info.kind === 'videoinput'){
      videoMenuItems.push(<MenuItem key={info.deviceId}
        onClick={()=>{closeVideoMenu(info.deviceId)}}
        > { info.label }</MenuItem>)
    }
  })
  function updateDevices(ev:React.MouseEvent){
    navigator.mediaDevices.enumerateDevices()
    .then(gotDevices)
    .catch(()=>{ console.log('Device enumeration error') })
  }

  return (
    <div className={classes.box}>
      <Fab className={classes.margin} size = "small" color={mute.muteS ? 'primary' : 'secondary' }
        aria-label="speaker" onClick = {
           () => { participants.local.get().plugins.streamControl.muteAudio = !mute.muteS }
        }>
        {mute.muteS ? <SpeakerOffIcon /> : <SpeakerOnIcon /> }
      </Fab>
      <Fab className={classes.small} size="small" onClick = { (ev) => {
          updateDevices(ev)
          setSpeakerMenuEl(ev.currentTarget)
        }}>
        <MoreIcon />
      </Fab>
      <Menu anchorEl={speakerMenuEl} keepMounted={true} open={Boolean(speakerMenuEl)} onClose={()=>{closeSpeakerMenu('')}}>
        {speakerMenuItems}
      </Menu>

      <Fab className={classes.margin} size = "small" color={mute.muteA ? 'primary' : 'secondary' }
        aria-label="mic" onClick = { () => { participants.local.get().plugins.streamControl.muteAudio = !mute.muteA }}>
        {mute.muteA ? <MicOffIcon /> : <MicIcon /> }
      </Fab>
      <Fab className={classes.small} size="small" onClick = { (ev) => {
          updateDevices(ev)
          setMicMenuEl(ev.currentTarget)
        }}>
        <MoreIcon />
      </Fab>
      <Menu anchorEl={micMenuEl} keepMounted={true} open={Boolean(micMenuEl)} onClose={()=>{closeMicMenu('')}}>
        {micMenuItems}
      </Menu>

      <Fab className={classes.margin} size = "small" color={mute.muteV ? 'primary' : 'secondary'}
          aria-label="camera" onClick = { () => {
            participants.local.get().plugins.streamControl.muteVideo = !mute.muteV
            console.log('muteV:', mute.muteV)
          }
      }>
        {mute.muteV ? <VideoOffIcon /> : <VideoIcon /> }
      </Fab>
      <Fab className={classes.small} size="small"
        aria-label="cameraSelect" onClick = { (ev) => {
          updateDevices(ev)
          setVideoMenuEl(ev.currentTarget)
        }}>
        <MoreIcon />
      </Fab>
      <Menu anchorEl={videoMenuEl} keepMounted={true} open={Boolean(videoMenuEl)} onClose={()=>{closeVideoMenu('')}}>
        {videoMenuItems}
      </Menu>

      <Fab className={classes.margin} size = "small" color={false ? 'secondary' : 'primary'}
        aria-label="share">
        <ScreenShareIcon />
      </Fab>
   </div>
  )
}
Footer.displayName = 'Footer'
