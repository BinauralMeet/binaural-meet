import {ErrorDialog} from '@components/error/ErrorDialog'
import {dialogStyle} from '@components/utils'
import {acceleratorText2El} from '@components/utils/formatter'
import megaphoneIcon from '@iconify/icons-mdi/megaphone'
import {Icon} from '@iconify/react'
import {Collapse} from '@material-ui/core'
import Menu from '@material-ui/core/Menu'
import MenuItem from '@material-ui/core/MenuItem'
import Popover from '@material-ui/core/Popover'
import {makeStyles} from '@material-ui/core/styles'
import MicIcon from '@material-ui/icons/Mic'
import MicOffIcon from '@material-ui/icons/MicOff'
import SettingsIcon from '@material-ui/icons/Settings'
import VideoIcon from '@material-ui/icons/Videocam'
import VideoOffIcon from '@material-ui/icons/VideocamOff'
import SpeakerOffIcon from '@material-ui/icons/VolumeOff'
import SpeakerOnIcon from '@material-ui/icons/VolumeUp'
import {useTranslation} from '@models/locales'
import {useObserver} from 'mobx-react-lite'
import React, {useEffect, useRef} from 'react'
import {AdminConfigForm} from './adminConfig/AdminConfigForm'
import {BroadcastControl} from './BroadcastControl'
import {FaceControl} from './FaceControl'
import {FabMain, FabWithTooltip} from '@components/utils/FabEx'
import {ShareButton} from './share/ShareButton'
import {RecorderButton} from './recorder/RecorderButton'
import {Fab3DSettings} from './Fab3DSettings'
import { player, recorder } from '@models/recorder'
import {participants, map} from '@stores/'
import { RecorderStepType } from './recorder/RecorderDialog'


const useStyles = makeStyles({
  root:{
    position: 'absolute',
    width: '100%',
    bottom: 0,
    padding: 0,
    outline: 'none',
    pointerEvents: 'none',
  },
  wrapper:{width:'100%'},
  wrapperInner:{width:'100%', display:'flex', alignItems:'flex-end'},
})

class Member{
  timeoutOut = 0
  touched = false
}

export const Footer: React.FC<{height?:number}> = (props) => {
  //  show or not
  const [showFooter, setShowFooterRaw] = React.useState<boolean>(true)
  const [showAdmin, setShowAdmin] = React.useState<boolean>(false)
  function openAdmin(){
    map.keyInputUsers.add('adminForm')
    setShowAdmin(true)
  }
  function closeAdmin(){
    map.keyInputUsers.delete('adminForm')
    setShowAdmin(false)
  }
  const [showShare, setShowShareRaw] = React.useState<boolean>(false)
  function setShowShare(flag: boolean) {
    if (flag) {
      map.keyInputUsers.add('shareDialog')
    }else {
      map.keyInputUsers.delete('shareDialog')
    }
    setShowShareRaw(flag)
  }
  const [recorderStep, setRecorderStepRaw] = React.useState<RecorderStepType>('none')
  function setRecorderStep(step: RecorderStepType) {
    if (step !== 'none') {
      map.keyInputUsers.add('recorderDialog')
    }else {
      map.keyInputUsers.delete('recorderDialog')
    }
    setRecorderStepRaw(step)
  }

  const memberRef = useRef<Member>(new Member())
  const member = memberRef.current
  const containerRef = useRef<HTMLDivElement>(null)
  const adminButton = useRef<HTMLDivElement>(null)

  //  Fab state and menu
  const [deviceInfos, setDeviceInfos] = React.useState<MediaDeviceInfo[]>([])
  const [micMenuEl, setMicMenuEl] = React.useState<Element|null>(null)
  const [speakerMenuEl, setSpeakerMenuEl] = React.useState<Element|null>(null)
  const [videoMenuEl, setVideoMenuEl] = React.useState<Element|null>(null)

  const {t} = useTranslation()
  const classes = useStyles()

  //  Footer collapse conrtrol
  function checkMouseOnBottom() {
    return map.screenSize[1] - (map.mouse[1] - map.offset[1]) < 90
  }
  const mouseOnBottom = useObserver(checkMouseOnBottom)
  useEffect(() => {
    if (checkMouseOnBottom()) { member.touched = true }
    setShowFooter(mouseOnBottom || !member.touched)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },        [mouseOnBottom, member.touched])

  function setShowFooter(showFooter: boolean) {
    if (showFooter) {
      setShowFooterRaw(true)
      if (member.timeoutOut) {
        window.clearTimeout(member.timeoutOut)
        member.timeoutOut = 0
      }
      containerRef.current?.focus()
    }else {
      if (!member.timeoutOut) {
        member.timeoutOut = window.setTimeout(() => {
          setShowFooterRaw(false)
          member.timeoutOut = 0
        },                             500)
      }
    }
  }

  //  keyboard shortcut
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      //  console.log(`onKeyDown: code: ${e.code}`)
      if (map.keyInputUsers.size === 0) {
        if (!e.ctrlKey && !e.metaKey && !e.altKey){
          if (e.code === 'KeyM') {  //  mute/unmute audio
            participants.local.muteAudio = !participants.local.muteAudio
            setShowFooter(true)
          }
          if (e.code === 'KeyC') {  //  Create share dialog
            setShowFooter(true)
            setShowShare(true)
            e.preventDefault()
            e.stopPropagation()
          }
          if (e.code === 'KeyR') {  //  Recorder dialog
            setShowFooter(true)
            setRecorderStep('menu')
            if (recorder.recording) recorder.stop()
            if (player.state === 'play') player.stop()
            e.preventDefault()
            e.stopPropagation()
          }
          if (e.code === 'KeyL' || e.code === 'Escape') {  //  Leave from keyboard
            participants.local.physics.awayFromKeyboard = true
          }
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },        [])

  //  Create menu list for device selection
  function makeMenuItem(info: MediaDeviceInfo, close:(did:string) => void):JSX.Element {
    let selected = false
    selected = info.deviceId === participants.local.devicePreference[info.kind]

    return <MenuItem key={info.deviceId} style={dialogStyle}
      onClick={() => { close(info.deviceId) }}
      > { (selected ? '✔\u00A0' : '\u2003') + info.label }</MenuItem>  //  \u00A0: NBSP, u2003: EM space.
  }
  function getMenuItems(kind:'audioinput' | 'audiooutput' | 'videoinput'){
    const rv = []
    let closeMenu
    let bottomItem
    if (kind === 'audioinput'){
      closeMenu = closeMicMenu
      bottomItem = <MenuItem  key = {'broadcast'} ><BroadcastControl {...props} /></MenuItem>
    }else if (kind === 'audiooutput'){
      closeMenu = closeSpeakerMenu
    }else{
      closeMenu = closeVideoMenu
      bottomItem = <MenuItem  key = {'faceTrack'} ><FaceControl {...props} /></MenuItem>
    }
    for (const info of deviceInfos){
      if (info.kind === kind) {
        rv.push(makeMenuItem(info, closeMenu))
      }
    }
    if (bottomItem) rv.push(bottomItem)
    return rv
  }
  function closeMicMenu(did:string) {
    if (did) {
      participants.local.devicePreference.audioinput = did
      participants.local.saveMediaSettingsToStorage()
    }
    setMicMenuEl(null)
  }
  function closeSpeakerMenu(did:string) {
    if (did) {
      participants.local.devicePreference.audiooutput = did
      participants.local.saveMediaSettingsToStorage()
    }
    setSpeakerMenuEl(null)
  }
  function closeVideoMenu(did:string) {
    if (did) {
      participants.local.devicePreference.videoinput = did
      participants.local.saveMediaSettingsToStorage()
    }
    setVideoMenuEl(null)
  }

  //  Device list update when the user clicks to showFooter the menu
  function updateDevices(ev:React.PointerEvent | React.MouseEvent | React.TouchEvent) {
    navigator.mediaDevices.enumerateDevices()
    .then(setDeviceInfos)
    .catch(() => { console.log('Device enumeration error') })
  }

  //  observer
  const mute = useObserver(() => ({
    muteA: participants.local.muteAudio,  //  mic
    muteS: participants.local.muteSpeaker,  //  speaker
    muteV: participants.local.muteVideo,  //  camera
    onStage: participants.local.physics.onStage
  }))
  const fabSize = props.height
  const iconSize = props.height ? props.height * 0.7 : 36

  return <div ref={containerRef} className={classes.root}>
    <Collapse in={showFooter} classes={classes}>
      <Fab3DSettings size={fabSize} iconSize={iconSize} {...props}/>
      <FabMain size={fabSize} color={mute.muteS ? 'primary' : 'secondary' }
        aria-label="speaker" onClick={() => {
          participants.local.muteSpeaker = !mute.muteS
          if (participants.local.muteSpeaker) {
            participants.local.muteAudio = true
          }
          participants.local.saveMediaSettingsToStorage()
        }}
        onClickMore = { (ev) => {
          updateDevices(ev)
          setSpeakerMenuEl(ev.currentTarget)
        }}
        >
        {mute.muteS ? <SpeakerOffIcon style={{width:iconSize, height:iconSize}} />
          : <SpeakerOnIcon style={{width:iconSize, height:iconSize}} /> }
      </FabMain>
      {speakerMenuEl ? <Menu anchorEl={speakerMenuEl} keepMounted={true}
        open={Boolean(speakerMenuEl)} onClose={() => { closeSpeakerMenu('') }}>
        {getMenuItems('audiooutput')}
      </Menu> : undefined}

      <FabWithTooltip size={fabSize} color={mute.muteA ? 'primary' : 'secondary' } aria-label="mic"
        title = {acceleratorText2El(t('ttMicMute'))}
        onClick = { () => {
          participants.local.muteAudio = !mute.muteA
          if (!participants.local.muteAudio) {
            participants.local.muteSpeaker = false
          }
          participants.local.saveMediaSettingsToStorage()
        }}
        onClickMore = { (ev) => {
          updateDevices(ev)
          setMicMenuEl(ev.currentTarget)
        } }
        >
        {mute.muteA ? <MicOffIcon style={{width:iconSize, height:iconSize}} /> :
          mute.onStage ?
            <Icon icon={megaphoneIcon} style={{width:iconSize, height:iconSize}} color="gold" />
            : <MicIcon style={{width:iconSize, height:iconSize}} /> }
      </FabWithTooltip>
      {micMenuEl ? <Menu anchorEl={micMenuEl} keepMounted={true}
        open={Boolean(micMenuEl)} onClose={() => { closeMicMenu('') }}>
        {getMenuItems('audioinput')}
      </Menu> : undefined}

      <FabMain size={fabSize} color={mute.muteV ? 'primary' : 'secondary'} aria-label="camera"
        onClick = { () => {
          participants.local.muteVideo = !mute.muteV
          participants.local.saveMediaSettingsToStorage()
        }}
        onClickMore = { (ev) => {
          updateDevices(ev)
          setVideoMenuEl(ev.currentTarget)
        } }
      >
        {mute.muteV ? <VideoOffIcon style={{width:iconSize, height:iconSize}} />
          : <VideoIcon style={{width:iconSize, height:iconSize}} /> }
      </FabMain>
      {videoMenuEl ? <Menu anchorEl={videoMenuEl} keepMounted={true}
        open={Boolean(videoMenuEl)} onClose={() => { closeVideoMenu('') }}>
        {getMenuItems('videoinput')}
      </Menu> : undefined}

      <ShareButton {...props} size={fabSize} iconSize={iconSize} showDialog={showShare}
        setShowDialog={setShowShare} />

      <ErrorDialog {...props}/>

      <div style={{marginLeft:'auto', marginRight:0, whiteSpace:'nowrap'}}>
        <RecorderButton {...props} size={fabSize} iconSize={iconSize}
          recorderStep={recorderStep} setRecorderStep={setRecorderStep} />
        <FabMain size={fabSize} onClick={openAdmin} divRef={adminButton}
          style={{marginRight:10, opacity:0.1}}>
          <SettingsIcon style={{width:iconSize, height:iconSize}} />
        </FabMain>
      </div>
      {showAdmin ? <Popover open={showAdmin} onClose={closeAdmin}
        anchorEl={adminButton.current} anchorOrigin={{vertical:'top', horizontal:'left'}}
        anchorReference = "anchorEl" >
        <AdminConfigForm close={closeAdmin}/>
      </Popover> : undefined}
    </Collapse>
  </div>
}
Footer.displayName = 'Footer'
