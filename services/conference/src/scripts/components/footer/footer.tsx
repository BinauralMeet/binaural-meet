import {BaseProps} from '@components/utils'
import {useStore as useParticipantsStore} from '@hooks/ParticipantsStore'
import megaphoneIcon from '@iconify/icons-mdi/megaphone'
import {Icon} from '@iconify/react'
import Menu from '@material-ui/core/Menu'
import MenuItem from '@material-ui/core/MenuItem'
import {makeStyles} from '@material-ui/core/styles'
import MoreIcon from '@material-ui/icons/ExpandMore'
import MicIcon from '@material-ui/icons/Mic'
import MicOffIcon from '@material-ui/icons/MicOff'
import VideoIcon from '@material-ui/icons/Videocam'
import VideoOffIcon from '@material-ui/icons/VideocamOff'
import SpeakerOffIcon from '@material-ui/icons/VolumeOff'
import SpeakerOnIcon from '@material-ui/icons/VolumeUp'
import {useObserver} from 'mobx-react-lite'
import React from 'react'
import {BroadcastControl} from './BroadcastControl'
import {FabMain, FabSub} from './FabNoFocus'
import {ShareButton} from './share/ShareButton'
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
      pointerEvents: 'none',
    },
  })
})


// onDrag: (state:DragState<ET>) => void

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

  const micMenuItems:JSX.Element[] = [<MenuItem  key = {'broadcast'} ><BroadcastControl /></MenuItem>]
  const speakerMenuItems:JSX.Element[] = []
  const videoMenuItems:JSX.Element[] = []
  deviceInfos.map((info) => {
    if (info.kind === 'audioinput') {
      const broadcastControl = micMenuItems.pop() as JSX.Element
      micMenuItems.push(makeMenuItem(info, closeMicMenu))
      micMenuItems.push(broadcastControl)
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
      <StereoAudioSwitch />

      <FabMain color={mute.muteS ? 'primary' : 'secondary' }
        aria-label="speaker" onClick = {
           () => { participants.local.get().plugins.streamControl.muteSpeaker = !mute.muteS }
        }>
        {mute.muteS ? <SpeakerOffIcon /> : <SpeakerOnIcon /> }
      </FabMain>
      <FabSub onClick = { (ev) => {
        updateDevices(ev)
        setSpeakerMenuEl(ev.currentTarget)
      }}>
        <MoreIcon />
      </FabSub>
      <Menu anchorEl={speakerMenuEl} keepMounted={true}
        open={Boolean(speakerMenuEl)} onClose={() => { closeSpeakerMenu('') }}>
        {speakerMenuItems}
      </Menu>

      <FabMain color={mute.muteA ? 'primary' : 'secondary' } aria-label="mic"
        onClick = { () => { participants.local.get().plugins.streamControl.muteAudio = !mute.muteA }}>
        {mute.muteA ? <MicOffIcon /> : participants.local.get().physics.onStage ?
          <Icon icon={megaphoneIcon} height={'1.8em'} /> : <MicIcon /> }
      </FabMain>
      <FabSub onClick = { (ev) => {
        updateDevices(ev)
        setMicMenuEl(ev.currentTarget)
      }}>
        <MoreIcon />
      </FabSub>
      <Menu anchorEl={micMenuEl} keepMounted={true}
        open={Boolean(micMenuEl)} onClose={() => { closeMicMenu('') }}>
        {micMenuItems}
      </Menu>

      <FabMain color={mute.muteV ? 'primary' : 'secondary'}
          aria-label="camera" onClick = { () => {
            participants.local.get().plugins.streamControl.muteVideo = !mute.muteV
            console.debug('muteV:', mute.muteV)
          }
      }>
        {mute.muteV ? <VideoOffIcon /> : <VideoIcon /> }
      </FabMain>
      <FabSub aria-label="cameraSelect" onClick = { (ev) => {
        updateDevices(ev)
        setVideoMenuEl(ev.currentTarget)
      }}>
        <MoreIcon />
      </FabSub>
      <Menu anchorEl={videoMenuEl} keepMounted={true}
        open={Boolean(videoMenuEl)} onClose={() => { closeVideoMenu('') }}>
        {videoMenuItems}
      </Menu>

      <ShareButton />

   </div >
  )
}
Footer.displayName = 'Footer'
