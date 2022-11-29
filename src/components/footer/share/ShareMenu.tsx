import {BMProps} from '@components/utils'
import bxWindowClose from '@iconify-icons/bx/bx-window-close'
import clipboardPaste from '@iconify/icons-fluent/clipboard-arrow-right-24-regular'
import whiteboard24Regular from '@iconify/icons-fluent/whiteboard-24-regular'
import cursorDefaultOutline from '@iconify/icons-mdi/cursor-default-outline'
import {Icon} from '@iconify/react'
import Collapse from '@material-ui/core/Collapse'
import Divider from '@material-ui/core/Divider'
import FormControl from '@material-ui/core/FormControl'
import FormControlLabel from '@material-ui/core/FormControlLabel'
import List from '@material-ui/core/List'
import ListItem from '@material-ui/core/ListItem'
import Radio from '@material-ui/core/Radio'
import RadioGroup from '@material-ui/core/RadioGroup'
import CameraAltIcon from '@material-ui/icons/CameraAlt'
import ExpandLess from '@material-ui/icons/ExpandLess'
import ExpandMore from '@material-ui/icons/ExpandMore'
import DownloadIcon from '@material-ui/icons/GetApp'
import HttpIcon from '@material-ui/icons/Http'
import ImageIcon from '@material-ui/icons/Image'
import InsertDriveFileTwoTone from '@material-ui/icons/InsertDriveFileTwoTone';
import UploadIcon from '@material-ui/icons/Publish'
import ScreenShareIcon from '@material-ui/icons/ScreenShare'
import StopScreenShareIcon from '@material-ui/icons/StopScreenShare'
import SubjectIcon from '@material-ui/icons/Subject'
import {contentsToSave, loadToContents} from '@models/ISharedContent'
import {useTranslation} from '@models/locales'
import {MSTrack} from '@models/utils'
import {createContent, createContentFromText, createContentOfIframe, createContentOfText,
  createContentOfVideo} from '@stores/sharedContents/SharedContentCreator'
import {SharedContents} from '@stores/sharedContents/SharedContents'
import {isArray} from 'lodash'
import {Observer, useObserver} from 'mobx-react-lite'
import React, {useEffect, useRef} from 'react'
import {CameraSelectorMember} from './CameraSelector'
import {DialogIconItem} from '@components/utils/DialogIconItem'
import {Step} from './Step'
import {conference} from '@models/conference'
import { dateTimeString } from '@models/utils/date'

function startCapture(props:BMProps) {
  const fps = props.stores.contents.screenFps
  return new Promise<MediaStream>((resolve, reject) => {
    navigator.mediaDevices.getDisplayMedia({
      audio:true,
      video:{
        frameRate:{
          ideal: fps
        }
      }
    }).then(resolve).catch(reject)
  })
}

function downloadItems(contents:SharedContents) {
  const content = JSON.stringify(contentsToSave(contents.all))
  const blob = new Blob([content], {type: 'text/plain'})

  const a = document.createElement('a')
  const url = URL.createObjectURL(blob)
  a.href = url
  a.download = `BMC_${conference.room}_${dateTimeString()}.json`
  document.body.appendChild(a)
  a.click()
  setTimeout(() => {
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  },         0)
}
function importItems(ev: React.ChangeEvent<HTMLInputElement>, contents: SharedContents) {
  const files = ev.currentTarget?.files
  if (files && files.length) {
    files[0].text().then((text) => {
      const itemsRecv = JSON.parse(text)
      if (isArray(itemsRecv)) {
        const items = loadToContents(itemsRecv)
        items.forEach(content => {
          if (content.type === 'screen' || content.type === 'camera') { return }
          const newContent = createContent()
          Object.assign(newContent, content)
          contents.addLocalContent(newContent)
        })
      }
    })
  }
}

interface ShareMenuProps extends DialogPageProps, BMProps {
  cameras: CameraSelectorMember
}

export interface DialogPageProps extends BMProps {
  setStep: (step: Step) => void
}

export const ShareMenu: React.FC<ShareMenuProps> = (props) => {
  const {t} = useTranslation()
  const {contents, participants, map} = props.stores
  const mainScreen = useObserver(() => (
    {stream: contents.mainScreenStream, owner: contents.mainScreenOwner}))
  const showMouse = useObserver(() => participants.local.mouse.show)
  const fileInput = useRef<HTMLInputElement>(null)
  const [openMore, setOpenMore] = React.useState(false)

  //  for CameraSelector
  function updateDevices() {
    navigator.mediaDevices.enumerateDevices().then((infos) => {
      props.cameras.videos = infos.filter(info => info.kind === 'videoinput')
    })
    .catch(() => { console.warn('Device enumeration error') })
  }
  function setStep(step: Step) {
    if (step === 'camera'){
      updateDevices()
    }
    props.setStep(step)
  }

  //  menu handlers
  const importFile = () => {
    fileInput.current?.click()
  }
  const downloadFile = () => {
    setStep('none')
    downloadItems(contents)
  }
  const createText = () => {
    //  setStep('text')
    setStep('none')
    const tc = createContentOfText('', map)
    contents.shareContent(tc)
    contents.setEditing(tc.id)
  }
  const createFromClipboard = () => {
    setStep('none')
    navigator.clipboard.readText().then(str => {
      createContentFromText(str, map).then(c => {
        contents.shareContent(c)
      })
    })
  }
  const createWhiteboard = () => {
    setStep('none')
    let rand = new Uint32Array(4)
    rand = window.crypto.getRandomValues(rand)
    let randStr = ''
    rand.forEach(i => randStr += i.toString(16))
    createContentOfIframe(
      `https://wbo.ophir.dev/boards/BinauralMeet_${conference.room}_${randStr}`, map).then((c) => {
      contents.shareContent(c)
       contents.setEditing(c.id)
    })
  }
  const createScreen = () => {
    startCapture(props).then((ms) => {
      if (ms.getTracks().length) {
        const content = createContentOfVideo(ms.getTracks(), map, 'screen')
        contents.assignId(content)
        contents.getOrCreateContentTracks(conference.rtcConnection.peer, content.id)
        contents.shareContent(content)
        ms.getTracks().forEach((track) => {
          const msTrack:MSTrack = {
            track,
            peer: conference.rtcConnection.peer,
            role: content.id
          }
          conference.addOrReplaceLocalTrack(msTrack)
        })
      }
    })
    setStep('none')
  }
  const startMouse = () => {
    participants.local.mouse.show = !showMouse
    setStep('none')
  }
  const closeAllScreens = () => {
    const cids = contents.getLocalRtcContentIds()
    cids.forEach(cid => contents.removeByLocal(cid))
    setStep('none')
  }
  const screenAsBackgrouond = () => {
    if (contents.mainScreenOwner === participants.localId){
      conference.removeLocalTrackByRole(true, 'mainScreen')
    } else {
      startCapture(props).then((ms) => {
        if (ms.getTracks().length) {
          ms.getTracks().forEach((track) => {
            const msTrack:MSTrack = {
              track,
              peer: conference.rtcConnection.peer,
              role: 'mainScreen'
            }
            conference.addOrReplaceLocalTrack(msTrack)
            contents.mainScreenOwner = participants.localId
            contents.mainScreenStream = ms
          })
        }
      })
    }
    setStep('none')
  }

  //  keyboard shortcut
  useEffect(() => {
    const onKeyPress = (e: KeyboardEvent) => {
      if (map.keyInputUsers.has('shareDialog')) {
        if (e.code === 'KeyI') {
          importFile()
        }else if (e.code === 'KeyD') {
          downloadFile()
        }else if (e.code === 'KeyV') {
          createFromClipboard()
        }else if (e.code === 'KeyF') {
          e.preventDefault()
          setStep('iframe')
        }else if (e.code === 'KeyT') {
          e.preventDefault()
          createText()
        }else if (e.code === 'KeyG') {
          e.preventDefault()
          setStep('image')
        }else if (e.code === 'KeyW') {
          e.preventDefault()
          createWhiteboard()
        }else if (e.code === 'KeyB') {
          screenAsBackgrouond()
        }else if (e.code === 'KeyS') {
          createScreen()
        }else if (e.code === 'KeyM') {
          startMouse()
        }else if (e.code === 'KeyC') {
          setStep('camera')
        }else if (e.code === 'KeyL') {
          closeAllScreens()
        }
      }
    }
    window.addEventListener('keypress', onKeyPress)

    return () => {
      window.removeEventListener('keypress', onKeyPress)
    }
    //  eslint-disable-next-line react-hooks/exhaustive-deps
  },        [])


  return (
    <List>
      <DialogIconItem
        tip = {t('sharePasteTip')}
        key="paste" text={t('sharePaste')} icon={<Icon icon={clipboardPaste} style={{fontSize:'1.5rem'}} />}
         onClick={createFromClipboard}
      />
      <DialogIconItem
        tip = {t('shareImageTip')}
        key="shareImage" text={t('shareImage')} icon={<ImageIcon />} onClick={() => setStep('image')}
      />
      <DialogIconItem
        key="shareText" text={t('shareText')} icon={<SubjectIcon />} onClick={createText}
      />
      <DialogIconItem
        tip = {t('shareWhiteboardTip')}
        key="shareWhiteboard" text={t('shareWhiteboard')} icon={<Icon icon={whiteboard24Regular} style={{fontSize:'1.5rem'}} />}
         onClick={createWhiteboard}
      />

      <Divider />
      <DialogIconItem
        tip = {t('shareMouseTip')}
        key="shareMouse"
        icon={<Icon icon={cursorDefaultOutline} style={{fontSize:'1.5rem'}}/>}
        text={showMouse ?  t('stopMouse') : t('shareMouse')}
        onClick={() => {
          participants.local.mouse.show = !showMouse
          setStep('none')
        }}
      />
      <DialogIconItem key="shareCamera" text={t('shareCamera')} icon={<CameraAltIcon />}
        onClick={() => setStep('camera')}
      />
      <DialogIconItem
        tip = {t('shareScreenContentTip')}
        key="shareScreenContent"
        icon={<ScreenShareIcon />}
        text={t('shareScreenContent')}
        onClick={createScreen}
        secondEl = {<FormControl component="fieldset">
          <Observer>{
            ()=> <RadioGroup row aria-label="screen-fps" name="FPS" value={props.stores.contents.screenFps}
              onChange={(ev)=>{ props.stores.contents.setScreenFps(Number(ev.target.value)) }}
              onClick={(ev)=>{
                ev.stopPropagation()
                setTimeout(createScreen, 100)
              }}
            >
              <FormControlLabel value={1} control={<Radio />} label="1" />
              <FormControlLabel value={5} control={<Radio />} label="5" />
              <FormControlLabel value={15} control={<Radio />} label="15" />
              <FormControlLabel value={30} control={<Radio />} label="30" />
              <FormControlLabel value={60} control={<Radio />}
                label={<span>60&nbsp;&nbsp;&nbsp;&nbsp;{t('fps')}</span>} />
            </RadioGroup>
          }</Observer>
        </FormControl>}
      />
      {contents.getLocalRtcContentIds().length ?
        <div style={{paddingLeft:'1em'}}><DialogIconItem dense key = "stopScreen"
          icon={<Icon icon={bxWindowClose} style={{fontSize:'1.5rem'}}/>}
          text={t('stopScreen')}
          onClick={closeAllScreens}
          /></div> : undefined}
      <Divider />
      <ListItem button dense onClick={()=>{ setOpenMore(!openMore) }}>
        {openMore ? <ExpandLess /> : <ExpandMore />}
      </ListItem>
      <input type="file" accept="application/json" ref={fileInput} style={{display:'none'}}
        onChange={
          (ev) => {
            setStep('none')
            importItems(ev, contents)
          }
        }
      />
      <Collapse in={openMore} timeout="auto" unmountOnExit>
        <div style={{paddingLeft:'1em'}}>
          <DialogIconItem
            tip = {t('shareIframeTip')}
            key="shareIframe" text={t('shareIframe')} icon={<HttpIcon />} onClick={() => setStep('iframe')}
          />
          <DialogIconItem
            key="shareScreenBackground"
            icon={mainScreen.owner === participants.localId ? <StopScreenShareIcon /> : <ScreenShareIcon />}
            text={mainScreen.owner === participants.localId ? t('stopScreenBackground') : t('shareScreenBackground')}
            onClick={screenAsBackgrouond}
          />
          <Divider />
          <DialogIconItem
            key="shareImport" text={t('shareImport')} icon={<UploadIcon />} onClick={importFile}
            tip = {t('shareImportTip')}
          />
          <DialogIconItem
            key="shareDownload" text={t('shareDownload')} icon={<DownloadIcon />} onClick={downloadFile}
          />
          {/*<DialogIconItem
            tip = {t('shareGDriveTip')}
            key="shareGDrive" text={t('shareGDrive')} icon={<InsertDriveFileTwoTone />} onClick={() => setStep('Gdrive')}
          />*/}
        </div>
      </Collapse>
    </List>
  )
}
ShareMenu.displayName = 'ShareMenu'
