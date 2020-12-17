import {BaseProps} from '@components/utils'
import {useStore as useParticipantsStore} from '@hooks/ParticipantsStore'
import megaphoneIcon from '@iconify/icons-mdi/megaphone'
import {Icon} from '@iconify/react'
import Menu from '@material-ui/core/Menu'
import MenuItem from '@material-ui/core/MenuItem'
import {makeStyles} from '@material-ui/core/styles'
import MicIcon from '@material-ui/icons/Mic'
import MicOffIcon from '@material-ui/icons/MicOff'
import VideoIcon from '@material-ui/icons/Videocam'
import VideoOffIcon from '@material-ui/icons/VideocamOff'
import SpeakerOffIcon from '@material-ui/icons/VolumeOff'
import SpeakerOnIcon from '@material-ui/icons/VolumeUp'
import {useObserver} from 'mobx-react-lite'
import React, {useRef, useEffect} from 'react'
import {BroadcastControl} from './BroadcastControl'
import {FabMain} from './FabNoFocus'
import {ShareButton} from './share/ShareButton'
import {StereoAudioSwitch} from './StereoAudioSwitch'
import {Collapse} from '@material-ui/core';
import {AdminConfigForm} from './adminConfig/AdminConfigForm'
import Popover from '@material-ui/core/Popover';

const useStyles = makeStyles({
  box:{
    position: 'absolute',
    bottom: 0,
    //  backgroundColor: 'rgba(0,0,0,0.3)',
    height: 100,
    width: '100%',
  },
  container:{
    position: 'absolute',
    width: '100%',
    bottom: 0,
    //  backgroundColor: 'rgba(255,0,0,0.3)',
    padding: 8,
    outline: 'none',
  },
  left:{
    position: 'absolute',
    bottom: 0,
    left: 0,
    width:30,
    height:10,
    backgroundColor:'transparent'
  }
})


class Member{
  timeoutOut:NodeJS.Timeout|undefined = undefined
}

export const Footer: React.FC<BaseProps> = (props) => {
  const [show, setShow] = React.useState<boolean>(true)
  const [touch, setTouch] = React.useState<boolean>(false)

  const [showAdmin, setShowAdmin] = React.useState<boolean>(false)

  const classes = useStyles()
  const participants = useParticipantsStore()
  const [micMenuEl, setMicMenuEl] = React.useState<Element|null>(null)
  const [deviceInfos, setDeviceInfos] = React.useState<MediaDeviceInfo[]>([])
  const mute = useObserver(() => ({
    muteA: participants.local.get().plugins.streamControl.muteAudio,  //  mic
    muteS: participants.local.get().plugins.streamControl.muteSpeaker,  //  speaker
    muteV: participants.local.get().plugins.streamControl.muteVideo,  //  camera
  }))
  const memberRef = useRef<Member>(new Member())
  const member = memberRef.current

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
  function closeMicMenu(did:string) {
    if (did) { participants.local.get().devicePreference.audioInputDevice = did }
    setMicMenuEl(null)
  }
  const [speakerMenuEl, setSpeakerMenuEl] = React.useState<Element|null>(null)
  function closeSpeakerMenu(did:string) {
    if (did) { participants.local.get().devicePreference.audioOutputDevice = did }
    setSpeakerMenuEl(null)
  }
  const [videoMenuEl, setVideoMenuEl] = React.useState<Element|null>(null)
  function closeVideoMenu(did:string) {
    if (did) { participants.local.get().devicePreference.videoInputDevice = did }
    setVideoMenuEl(null)
  }
  function updateDevices(ev:React.PointerEvent | React.MouseEvent) {
    navigator.mediaDevices.enumerateDevices()
    .then(setDeviceInfos)
    .catch(() => { console.log('Device enumeration error') })
  }
  const containerRef = useRef<HTMLDivElement>(null)
  const adminButton = useRef<HTMLDivElement>(null)
  function showFooter(){
    if (member.timeoutOut) {
      clearTimeout(member.timeoutOut)
      member.timeoutOut = undefined
    }
    containerRef.current?.focus()
    setShow(true)
  }
  useEffect(()=>{
    containerRef.current?.focus()
  }, [containerRef.current])
  function hideFooter(){
    if (!member.timeoutOut) {
      member.timeoutOut = setTimeout(()=>{
        setShow(false)
        member.timeoutOut = undefined
      }, 500)
    }
  }
  function prevent(ev: React.MouseEvent){
    ev.preventDefault()
  }

  return <>
  <div className={classes.box} onMouseOver = {showFooter} onContextMenu={prevent}
    onTouchStart = {(ev)=>{showFooter(); setTouch(true) }}
  />
  <div tabIndex={0} ref={containerRef} className={classes.container} onPointerOver = {showFooter}
    onBlur = {(ev)=>{ if (touch) {setTouch(false); containerRef.current?.focus() } else { hideFooter()} } } onContextMenu={prevent}>
    <Collapse in={show}>
      <StereoAudioSwitch />
      <FabMain more color={mute.muteS ? 'primary' : 'secondary' }
        aria-label="speaker" onClick = { () => {
          participants.local.get().plugins.streamControl.muteSpeaker = !mute.muteS
          if (participants.local.get().plugins.streamControl.muteSpeaker) {
            participants.local.get().plugins.streamControl.muteAudio = true
          }
          participants.local.get().saveMuteStatusToStorage(false)
          console.debug('muteSpeaker:', participants.local.get().plugins.streamControl.muteSpeaker)
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

      <FabMain more color={mute.muteA ? 'primary' : 'secondary' } aria-label="mic"
        onClick = { () => {
          participants.local.get().plugins.streamControl.muteAudio = !mute.muteA
          if (!participants.local.get().plugins.streamControl.muteAudio) {
            participants.local.get().plugins.streamControl.muteSpeaker = false
          }
          participants.local.get().saveMuteStatusToStorage(false)
          console.debug('muteAudio:', participants.local.get().plugins.streamControl.muteAudio)
        }}
        onClickMore = { (ev) => {
          updateDevices(ev)
          setMicMenuEl(ev.currentTarget)
        } }
        >
        {mute.muteA ? <MicOffIcon fontSize="large" /> : participants.local.get().physics.onStage ?
          <Icon icon={megaphoneIcon} height={'2.4em'} color="gold" /> : <MicIcon fontSize="large" /> }
      </FabMain>
      <Menu anchorEl={micMenuEl} keepMounted={true}
        open={Boolean(micMenuEl)} onClose={() => { closeMicMenu('') }}>
        {micMenuItems}
      </Menu>

      <FabMain more color={mute.muteV ? 'primary' : 'secondary'} aria-label="camera"
        onClick = { () => {
          participants.local.get().plugins.streamControl.muteVideo = !mute.muteV
          participants.local.get().saveMuteStatusToStorage(false)
          console.debug('muteVideo:', participants.local.get().plugins.streamControl.muteVideo)
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

      <ShareButton />

      <div className={classes.left} ref={adminButton}
        onClick = { () => setShowAdmin(true) }>
      </div>
      <Popover open={showAdmin} onClose={()=>setShowAdmin(false)}
          anchorEl={adminButton.current} anchorOrigin={{vertical:'top', horizontal:'left'}}
          anchorReference = 'anchorEl' >
          <AdminConfigForm close={()=>setShowAdmin(false)}/>
        </Popover>

    </Collapse>
  </div >
  </>
}
Footer.displayName = 'Footer'
