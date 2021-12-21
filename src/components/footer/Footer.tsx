import {ErrorDialog} from '@components/error/ErrorDialog'
import {BMProps} from '@components/utils'
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
import {FabMain, FabWithTooltip} from './FabEx'
import {ShareButton} from './share/ShareButton'
import {StereoAudioSwitch} from './StereoAudioSwitch'

const useStyles = makeStyles({
  container:{
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
  timeoutOut:NodeJS.Timeout|undefined = undefined
  touched = false
}

export const Footer: React.FC<BMProps&{height?:number}> = (props) => {
  const {map, participants} = props.stores
  //  showor not
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
  const adminButton = useRef<HTMLDivElement>(null)
  //  observers
  const mute = useObserver(() => ({
    muteA: participants.local.muteAudio,  //  mic
    muteS: participants.local.muteSpeaker,  //  speaker
    muteV: participants.local.muteVideo,  //  camera
    onStage: participants.local.physics.onStage
  }))
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

  //  render footer
  return React.useMemo(() => {
    //  Create menu list for device selection
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

    const micMenuItems:JSX.Element[] = [<MenuItem  key = {'broadcast'} ><BroadcastControl {...props} /></MenuItem>]
    const speakerMenuItems:JSX.Element[] = []
    const videoMenuItems:JSX.Element[] = []
    deviceInfos.forEach((info) => {
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
        participants.local.saveMediaSettingsToStorage()
      }
      setMicMenuEl(null)
    }
    function closeSpeakerMenu(did:string) {
      if (did) {
        participants.local.devicePreference.audioOutputDevice = did
        participants.local.saveMediaSettingsToStorage()
      }
      setSpeakerMenuEl(null)
    }
    function closeVideoMenu(did:string) {
      if (did) {
        participants.local.devicePreference.videoInputDevice = did
        participants.local.saveMediaSettingsToStorage()
      }
      setVideoMenuEl(null)
    }

    //  Device list update when the user clicks to show the menu
    const fabSize = props.height
    const iconSize = props.height ? props.height * 0.7 : 36
    function updateDevices(ev:React.PointerEvent | React.MouseEvent | React.TouchEvent) {
      navigator.mediaDevices.enumerateDevices()
      .then(setDeviceInfos)
      .catch(() => { console.log('Device enumeration error') })
    }

    function openAdmin(){
      map.keyInputUsers.add('adminForm')
      setShowAdmin(true)
    }
    function closeAdmin(){
      map.keyInputUsers.delete('adminForm')
      setShowAdmin(false)
    }

    return <div ref={containerRef} className={classes.container}>
      <Collapse in={show} classes={classes}>
        <StereoAudioSwitch size={fabSize} iconSize={iconSize} {...props}/>
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
        <Menu anchorEl={speakerMenuEl} keepMounted={true}
          open={Boolean(speakerMenuEl)} onClose={() => { closeSpeakerMenu('') }}>
          {speakerMenuItems}
        </Menu>

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
        <Menu anchorEl={micMenuEl} keepMounted={true}
          open={Boolean(micMenuEl)} onClose={() => { closeMicMenu('') }}>
          {micMenuItems}
        </Menu>

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
        <Menu anchorEl={videoMenuEl} keepMounted={true}
          open={Boolean(videoMenuEl)} onClose={() => { closeVideoMenu('') }}>
          {videoMenuItems}
        </Menu>

        <ShareButton {...props} size={fabSize} iconSize={iconSize} showDialog={showShare}
          setShowDialog={setShowShare} />

        <ErrorDialog {...props}/>

        <FabMain size={fabSize} onClick={openAdmin} divRef={adminButton}
          style={{marginLeft:'auto', marginRight:10, opacity:0.1}}>
          <SettingsIcon style={{width:iconSize, height:iconSize}} />
        </FabMain>
        <Popover open={showAdmin} onClose={closeAdmin}
          anchorEl={adminButton.current} anchorOrigin={{vertical:'top', horizontal:'left'}}
          anchorReference = "anchorEl" >
          <AdminConfigForm close={closeAdmin} stores={props.stores}/>
        </Popover>
      </Collapse>
    </div >
  },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mute.muteA, mute.muteS, mute.muteV, mute.onStage,
    show, showAdmin, showShare, micMenuEl, speakerMenuEl, videoMenuEl, deviceInfos]

    )
}
Footer.displayName = 'Footer'
