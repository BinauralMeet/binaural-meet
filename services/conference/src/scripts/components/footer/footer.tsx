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
import SpeakerOffIcon from '@material-ui/icons/VolumeOff'
import SpeakerOnIcon from '@material-ui/icons/VolumeUp'
import {useObserver} from 'mobx-react-lite'
import React from 'react'
import {StereoAudioSwitch} from './StereoAudioSwitch'

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
    itemSelected: {
      color: 'primary',
    },
    item:{
    },
  })
})


export const Footer: React.FC<BaseProps> = (props) => {
  const classes = useStyles()
  const participants = useParticipantsStore()

  const [micMenuEl, setMicMenuEl] = React.useState<Element|null>(null)
  const closeMicMenu = (did:string) => {
    if (did) { participants.local.get().devicePreference.audioInputDevice = did }
    setMicMenuEl(null)
  }
  const [speakerMenuEl, setSpeakerMenuEl] = React.useState<Element|null>(null)
  const closeSpeakerMenu = (did:string) => {
    if (did) { participants.local.get().devicePreference.audioOutputDevice = did }
    setSpeakerMenuEl(null)
  }
  const [videoMenuEl, setVideoMenuEl] = React.useState<Element|null>(null)
  const closeVideoMenu = (did:string) => {
    if (did) { participants.local.get().devicePreference.videoInputDevice = did }
    setVideoMenuEl(null)
  }
  const [deviceInfos, setDeviceInfos] = React.useState<MediaDeviceInfo[]>([])

  const mute = useObserver(() => ({
    muteA: participants.local.get().plugins.streamControl.muteAudio,  //  mic
    muteS: participants.local.get().plugins.streamControl.muteSpeaker,  //  speaker
    muteV: participants.local.get().plugins.streamControl.muteVideo,  //  camera
  }))

  function makeMenuItem(info: MediaDeviceInfo, close:(did:string) => void):JSX.Element {
    let selected = false
    if (info.kind === 'audioinput') {
      selected = info.deviceId === participants.local.get().devicePreference.audioInputDevice
    }else if (info.kind === 'audiooutput') {
      selected = info.deviceId === participants.local.get().devicePreference.audioOutputDevice
    }else if (info.kind === 'videoinput') {
      selected = info.deviceId === participants.local.get().devicePreference.videoInputDevice
    }

    return <MenuItem key={info.deviceId}
      onClick={() => { close(info.deviceId) }}
      > { (selected ? '✔\u00A0' : '\u2003') + info.label }</MenuItem>  //  \u00A0: NBSP, u2003: EM space.
  }
  const micMenuItems:JSX.Element[] = []
  const speakerMenuItems:JSX.Element[] = []
  const videoMenuItems:JSX.Element[] = []
  deviceInfos.map((info) => {
    if (info.kind === 'audioinput') {
      micMenuItems.push(makeMenuItem(info, closeMicMenu))
    }
    if (info.kind === 'audiooutput') {
      speakerMenuItems.push(makeMenuItem(info, closeSpeakerMenu))
    }
    if (info.kind === 'videoinput') {
      videoMenuItems.push(makeMenuItem(info, closeVideoMenu))
    }
  })
  function updateDevices(ev:React.MouseEvent) {
    navigator.mediaDevices.enumerateDevices()
    .then(setDeviceInfos)
    .catch(() => { console.log('Device enumeration error') })
  }

  return (
    <div className={classes.box}>
      <StereoAudioSwitch className={classes.margin} />

      <Fab className={classes.margin} size = "small" color={mute.muteS ? 'primary' : 'secondary' }
        aria-label="speaker" onClick = {
           () => { participants.local.get().plugins.streamControl.muteSpeaker = !mute.muteS }
        }>
        {mute.muteS ? <SpeakerOffIcon /> : <SpeakerOnIcon /> }
      </Fab>
      <Fab className={classes.small} size="small" onClick = { (ev) => {
        updateDevices(ev)
        setSpeakerMenuEl(ev.currentTarget)
      }}>
        <MoreIcon />
      </Fab>
      <Menu anchorEl={speakerMenuEl} keepMounted={true}
        open={Boolean(speakerMenuEl)} onClose={() => { closeSpeakerMenu('') }}>
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
      <Menu anchorEl={micMenuEl} keepMounted={true}
        open={Boolean(micMenuEl)} onClose={() => { closeMicMenu('') }}>
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
      <Menu anchorEl={videoMenuEl} keepMounted={true}
        open={Boolean(videoMenuEl)} onClose={() => { closeVideoMenu('') }}>
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
