import {BMProps, RadioWithLabel} from '@components/utils'
import bxWindowClose from '@iconify-icons/bx/bx-window-close'
import clipboardPaste from '@iconify/icons-fluent/clipboard-arrow-right-24-regular'
import whiteboard24Regular from '@iconify/icons-fluent/whiteboard-24-regular'
import cursorDefaultOutline from '@iconify/icons-mdi/cursor-default-outline'
import {Icon} from '@iconify/react'
import Collapse from '@material-ui/core/Collapse'
import Divider from '@material-ui/core/Divider'
import FormControl from '@material-ui/core/FormControl'
import List from '@material-ui/core/List'
import ListItem from '@material-ui/core/ListItem'
import RadioGroup from '@material-ui/core/RadioGroup'
import cameraAltIcon from '@iconify/icons-ic/round-camera-alt'
import expandLess from '@iconify/icons-material-symbols/expand-less-rounded'
import expandMore from '@iconify/icons-material-symbols/expand-more-rounded'
import uploadIcon from '@iconify/icons-ic/round-upload'
import downloadIcon from '@iconify/icons-ic/round-get-app'
import httpIcon from '@iconify/icons-material-symbols/http-rounded'
import imageRounded from '@iconify/icons-material-symbols/image-rounded'

import InsertDriveFileTwoTone from '@material-ui/icons/InsertDriveFileTwoTone';
import screenShareIcon from '@iconify/icons-material-symbols/screen-share'
import stopScreenShareIcon from '@iconify/icons-material-symbols/stop-screen-share'
import subjectIcon from '@iconify/icons-material-symbols/subject'

import {contentsToSave, loadToContents} from '@models/ISharedContent'
import {useTranslation} from '@models/locales'
import {MSTrack} from '@models/conference/RtcConnection'
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
import { isSmartphone } from '@models/utils'

function startCapture(props:BMProps) {
  const fps = props.stores.contents.screenFps
  return new Promise<MediaStream>((resolve, reject) => {
    navigator.mediaDevices.getDisplayMedia({
      audio:{
        channelCount:{
          ideal: 2
        },
        echoCancellation: false
      },
      video:{
        frameRate:{
          ideal: fps
        }
      }
    }).then((ms)=>{
      const audios = ms.getAudioTracks()
      let count = audios.length
      audios.forEach(track => {
        const ec = track.getCapabilities().echoCancellation
        if (ec && ec.findIndex(v => v===false) >= 0){
          const constraint:MediaTrackConstraints ={
            echoCancellation: false
          }
          track.applyConstraints(constraint).then(()=>{
            count --
            if (count === 0) resolve(ms)
          }).catch(e => {
            console.warn(`applyConstraints failed: ${e}`)
            count --
            if (count === 0) resolve(ms)
          })
        }else{
          count --
        }
      })
      if (count === 0) resolve(ms)
    }).catch(reject)
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
        contents.getOrCreateContentTracks(conference.rtcTransports.peer, content.id)
        contents.shareContent(content)
        ms.getTracks().forEach((track) => {
          const msTrack:MSTrack = {
            track,
            peer: conference.rtcTransports.peer,
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
              peer: conference.rtcTransports.peer,
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
    const onKeyDown = (e: KeyboardEvent) => {
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
    window.addEventListener('keypress', onKeyDown)

    return () => {
      window.removeEventListener('keypress', onKeyDown)
    }
    //  eslint-disable-next-line react-hooks/exhaustive-deps
  },        [])

  return (
    <List>
      <DialogIconItem
        tip = {t('sharePasteTip')}
        key="paste" text={t('sharePaste')} icon={<Icon icon={clipboardPaste}/>}
         onClick={createFromClipboard}
      />
      <DialogIconItem
        tip = {t('shareImageTip')}
        key="shareImage" text={t('shareImage')} icon={<Icon icon={imageRounded}/>} onClick={() => setStep('image')}
      />
      <DialogIconItem
        key="shareText" text={t('shareText')} icon={<Icon icon={subjectIcon}/>} onClick={createText}
      />
      <DialogIconItem
        tip = {t('shareWhiteboardTip')}
        key="shareWhiteboard" text={t('shareWhiteboard')} icon={<Icon icon={whiteboard24Regular} />}
         onClick={createWhiteboard}
      />

      <Divider />
      <DialogIconItem
        tip = {t('shareMouseTip')}
        key="shareMouse"
        icon={<Icon icon={cursorDefaultOutline} />}
        text={showMouse ?  t('stopMouse') : t('shareMouse')}
        onClick={() => {
          participants.local.mouse.show = !showMouse
          setStep('none')
        }}
      />
      <DialogIconItem key="shareCamera" text={t('shareCamera')} icon={<Icon icon={cameraAltIcon} />}
        onClick={() => setStep('camera')}
      />
      {isSmartphone() ? undefined :
      <DialogIconItem
        tip = {t('shareScreenContentTip')}
        key="shareScreenContent"
        icon={<Icon icon={screenShareIcon} />}
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
              <RadioWithLabel value="1" checked={props.stores.contents.screenFps===1}/>
              <RadioWithLabel value="5" checked={props.stores.contents.screenFps===5}/>
              <RadioWithLabel value="15" checked={props.stores.contents.screenFps===15}/>
              <RadioWithLabel value="30" checked={props.stores.contents.screenFps===30}/>
              <RadioWithLabel value="60" checked={props.stores.contents.screenFps===60}
                label={<span>60&nbsp;&nbsp;&nbsp;&nbsp;{t('fps')}</span>} />
            </RadioGroup>
          }</Observer>
        </FormControl>}
      />}
      {contents.getLocalRtcContentIds().length ?
        <div style={{paddingLeft:'1em'}}><DialogIconItem dense key = "stopScreen"
          icon={<Icon icon={bxWindowClose} />}
          text={t('stopScreen')}
          onClick={closeAllScreens}
          /></div> : undefined}
      <Divider />
      <ListItem button dense onClick={()=>{ setOpenMore(!openMore) }}>
        {openMore ? <Icon icon={expandLess} /> : <Icon icon={expandMore} />}
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
            key="shareIframe" text={t('shareIframe')} icon={<Icon icon={httpIcon} />} onClick={() => setStep('iframe')}
          />
          {isSmartphone()?undefined:
          <DialogIconItem
            key="shareScreenBackground"
            icon={mainScreen.owner === participants.localId ? <Icon icon={stopScreenShareIcon} /> : <Icon icon={screenShareIcon} />}
            text={mainScreen.owner === participants.localId ? t('stopScreenBackground') : t('shareScreenBackground')}
            onClick={screenAsBackgrouond}
          />}
          <Divider />
          <DialogIconItem
            key="shareImport" text={t('shareImport')} icon={<Icon icon={uploadIcon} />} onClick={importFile}
            tip = {t('shareImportTip')}
          />
          <DialogIconItem
            key="shareDownload" text={t('shareDownload')} icon={<Icon icon={downloadIcon} />} onClick={downloadFile}
          />
          {<DialogIconItem
            tip = {t('shareGDriveTip')}
            key="shareGDrive" text={t('shareGDrive')} icon={<InsertDriveFileTwoTone />} onClick={() => setStep('Gdrive')}
          />}
        </div>
      </Collapse>
    </List>
  )
}
ShareMenu.displayName = 'ShareMenu'
