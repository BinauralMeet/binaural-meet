import {ErrorDialog} from '@components/error/ErrorDialog'
import {useStore as useMap} from '@hooks/MapStore'
import {useStore as useParticipantsStore} from '@hooks/ParticipantsStore'
import megaphoneIcon from '@iconify/icons-mdi/megaphone'
import {Icon} from '@iconify/react'
import {Collapse} from '@material-ui/core'
import Menu from '@material-ui/core/Menu'
import MenuItem from '@material-ui/core/MenuItem'
import Popover from '@material-ui/core/Popover'
import {makeStyles} from '@material-ui/core/styles'
import MicIcon from '@material-ui/icons/Mic'
import MicOffIcon from '@material-ui/icons/MicOff'
import VideoIcon from '@material-ui/icons/Videocam'
import VideoOffIcon from '@material-ui/icons/VideocamOff'
import SpeakerOffIcon from '@material-ui/icons/VolumeOff'
import SpeakerOnIcon from '@material-ui/icons/VolumeUp'
import {useObserver} from 'mobx-react-lite'
import React, {useEffect, useRef} from 'react'
import {AdminConfigForm} from './adminConfig/AdminConfigForm'
import {BroadcastControl} from './BroadcastControl'
import {FabMain, FabWithTooltip} from './FabNoFocus'
import {ShareButton} from './share/ShareButton'
import {StereoAudioSwitch} from './StereoAudioSwitch'

const useStyles = makeStyles({
  container:{
    position: 'absolute',
    width: '100%',
    bottom: 0,
    //  backgroundColor: 'rgba(255,0,0,0.3)',
    padding: 8,
    outline: 'none',
    pointerEvents: 'none',
  },
  left:{
    position: 'absolute',
    bottom: 0,
    left: 0,
    width:30,
    height:15,
    pointerEvents: 'auto',
    backgroundColor:'transparent',
//    backgroundColor:'rgba(0,0,0,0.5)',
  },
})


class Member{
  timeoutOut:NodeJS.Timeout|undefined = undefined
  touched = false
}

export const Footer: React.FC = () => {
  //  show and hide
  const [show, setShow] = React.useState<boolean>(true)
  const [showAdmin, setShowAdmin] = React.useState<boolean>(false)
  const [showShare, setShowShareRaw] = React.useState<boolean>(false)
  function setShowShare(flag: boolean) {
    if (flag) {
      map.keyInputUsers.add('shareDialog')
    }else {
      map.keyInputUsers.delete('shareDialog')
    }
    setShowShareRaw(flag)
  }

  const memberRef = useRef<Member>(new Member())
  const member = memberRef.current
  const containerRef = useRef<HTMLDivElement>(null)
  const map = useMap()
  function checkMouseOnBottom() {
    return map.screenSize[1] - (map.mouse[1] - map.offset[1]) < 90
  }
  const mouseOnBottom = useObserver(checkMouseOnBottom)
  useEffect(() => {
    if (checkMouseOnBottom()) { member.touched = true }
    setShowFooter(mouseOnBottom || !member.touched)
  })
  function setShowFooter(show: boolean) {
    if (show) {
      setShow(true)
      if (member.timeoutOut) {
        clearTimeout(member.timeoutOut)
        member.timeoutOut = undefined
      }
      containerRef.current?.focus()
    }else {
      if (!member.timeoutOut) {
        member.timeoutOut = setTimeout(() => {
          setShow(false)
          member.timeoutOut = undefined
        },                             500)
      }
    }
  }

  //  Stores, observers and states
  const participants = useParticipantsStore()
  const mute = useObserver(() => ({
    muteA: participants.local.plugins.streamControl.muteAudio,  //  mic
    muteS: participants.local.plugins.streamControl.muteSpeaker,  //  speaker
    muteV: participants.local.plugins.streamControl.muteVideo,  //  camera
  }))
  const [micMenuEl, setMicMenuEl] = React.useState<Element|null>(null)
  const [deviceInfos, setDeviceInfos] = React.useState<MediaDeviceInfo[]>([])

  //  keyboard shortcut
  useEffect(() => {
    const onKeyPress = (e: KeyboardEvent) => {
      if (map.keyInputUsers.size === 0) {
        if (e.code === 'KeyM') {  //  mute/unmute audio
          participants.local.plugins.streamControl.muteAudio = !participants.local.plugins.streamControl.muteAudio
          setShowFooter(true)
        }
        if (e.code === 'KeyC') {  //  Create share dialog
          setShowFooter(true)
          setShowShare(true)
        }
      }
    }
    window.addEventListener('keypress', onKeyPress)

    return () => {
      window.removeEventListener('keypress', onKeyPress)
    }
  },        [])


  //  Fab state and menu
  const classes = useStyles()
  function makeMenuItem(info: MediaDeviceInfo, close:(did:string) => void):JSX.Element {
    let selected = false
    if (info.kind === 'audioinput') {
      selected = info.deviceId === participants.local.devicePreference.audioInputDevice
    }else if (info.kind === 'audiooutput') {
      selected = info.deviceId === participants.local.devicePreference.audioOutputDevice
    }else if (info.kind === 'videoinput') {
      selected = info.deviceId === participants.local.devicePreference.videoInputDevice
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
  function closeMicMenu(did:string) {
    if (did) {
      participants.local.devicePreference.audioInputDevice = did
      participants.local.saveMediaSettingsToStorage(true)
    }
    setMicMenuEl(null)
  }
  const [speakerMenuEl, setSpeakerMenuEl] = React.useState<Element|null>(null)
  function closeSpeakerMenu(did:string) {
    if (did) {
      participants.local.devicePreference.audioOutputDevice = did
      participants.local.saveMediaSettingsToStorage(true)
    }
    setSpeakerMenuEl(null)
  }
  const [videoMenuEl, setVideoMenuEl] = React.useState<Element|null>(null)
  function closeVideoMenu(did:string) {
    if (did) {
      participants.local.devicePreference.videoInputDevice = did
      participants.local.saveMediaSettingsToStorage(true)
    }
    setVideoMenuEl(null)
  }
  function updateDevices(ev:React.PointerEvent | React.MouseEvent) {
    navigator.mediaDevices.enumerateDevices()
    .then(setDeviceInfos)
    .catch(() => { console.log('Device enumeration error') })
  }

  const adminButton = useRef<HTMLDivElement>(null)

  return <>
  <div ref={containerRef} className={classes.container}>
    <Collapse in={show}>
      <StereoAudioSwitch />
      <FabMain color={mute.muteS ? 'primary' : 'secondary' }
        aria-label="speaker" onClick = { () => {
          participants.local.plugins.streamControl.muteSpeaker = !mute.muteS
          if (participants.local.plugins.streamControl.muteSpeaker) {
            participants.local.plugins.streamControl.muteAudio = true
          }
          participants.local.saveMediaSettingsToStorage(true)
        }}
        onClickMore = { (ev) => {
          updateDevices(ev)
          setSpeakerMenuEl(ev.currentTarget)
        }}
        >
        {mute.muteS ? <SpeakerOffIcon fontSize="large" /> : <SpeakerOnIcon fontSize="large" /> }
      </FabMain>
      <Menu anchorEl={speakerMenuEl} keepMounted={true}
        open={Boolean(speakerMenuEl)} onClose={() => { closeSpeakerMenu('') }}>
        {speakerMenuItems}
      </Menu>

      <FabWithTooltip color={mute.muteA ? 'primary' : 'secondary' } aria-label="mic"
        title = {<><strong>M</strong>ic mute</>}
        onClick = { () => {
          participants.local.plugins.streamControl.muteAudio = !mute.muteA
          if (!participants.local.plugins.streamControl.muteAudio) {
            participants.local.plugins.streamControl.muteSpeaker = false
          }
          participants.local.saveMediaSettingsToStorage(true)
        }}
        onClickMore = { (ev) => {
          updateDevices(ev)
          setMicMenuEl(ev.currentTarget)
        } }
        >
        {mute.muteA ? <MicOffIcon fontSize="large" /> : participants.local.physics.onStage ?
          <Icon icon={megaphoneIcon} height={'2.4em'} color="gold" /> : <MicIcon fontSize="large" /> }
      </FabWithTooltip>
      <Menu anchorEl={micMenuEl} keepMounted={true}
        open={Boolean(micMenuEl)} onClose={() => { closeMicMenu('') }}>
        {micMenuItems}
      </Menu>

      <FabMain color={mute.muteV ? 'primary' : 'secondary'} aria-label="camera"
        onClick = { () => {
          participants.local.plugins.streamControl.muteVideo = !mute.muteV
          participants.local.saveMediaSettingsToStorage(true)
        }}
        onClickMore = { (ev) => {
          updateDevices(ev)
          setVideoMenuEl(ev.currentTarget)
        } }
      >
        {mute.muteV ? <VideoOffIcon fontSize="large" /> : <VideoIcon fontSize="large" /> }
      </FabMain>
      <Menu anchorEl={videoMenuEl} keepMounted={true}
        open={Boolean(videoMenuEl)} onClose={() => { closeVideoMenu('') }}>
        {videoMenuItems}
      </Menu>

      <ShareButton showDialog={showShare} setShowDialog={setShowShare} />

      <ErrorDialog />

      <div className={classes.left} ref={adminButton} onClick = { () => setShowAdmin(true) } />
      <Popover open={showAdmin} onClose={() => setShowAdmin(false)}
        anchorEl={adminButton.current} anchorOrigin={{vertical:'top', horizontal:'left'}}
        anchorReference = "anchorEl" >
        <AdminConfigForm close={ () => setShowAdmin(false) } />
      </Popover>

    </Collapse>
  </div >
  </>
}
Footer.displayName = 'Footer'
