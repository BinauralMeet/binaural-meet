import {useStore as useMapStore} from '@hooks/MapStore'
import {useStore as useParticipantsStore} from '@hooks/ParticipantsStore'
import {useStore as useContentsStore} from '@hooks/SharedContentsStore'
import cursorDefaultOutline from '@iconify/icons-mdi/cursor-default-outline'
import {Icon} from '@iconify/react'
import Divider from '@material-ui/core/Divider'
import List from '@material-ui/core/List'
import DownloadIcon from '@material-ui/icons/GetApp'
import HttpIcon from '@material-ui/icons/Http'
import ImageIcon from '@material-ui/icons/Image'
import OpenInBrowserIcon from '@material-ui/icons/OpenInBrowser'
import UploadIcon from '@material-ui/icons/Publish'
import ScreenShareIcon from '@material-ui/icons/ScreenShare'
import StopScreenShareIcon from '@material-ui/icons/StopScreenShare'
import SubjectIcon from '@material-ui/icons/Subject'
import {SharedContent as ISharedContent} from '@models/SharedContent'
import {assert} from '@models/utils'
import {createContent, createContentOfVideo} from '@stores/sharedContents/SharedContentCreator'
import {SharedContents} from '@stores/sharedContents/SharedContents'
import JitsiMeetJS, {JitsiLocalTrack, browser} from 'lib-jitsi-meet'
import {isArray} from 'lodash'
import {useObserver} from 'mobx-react-lite'
import React, {useRef} from 'react'
import {DialogPageProps} from './DialogPage'
import {ShareDialogItem} from './SharedDialogItem'

async function startCapture(displayMediaOptions: any = {}) {
  if (browser.usesUnifiedPlan())  {
    return []
  }

  let captureTracks = null

  try {
    // @ts-ignore FIXME: https://github.com/microsoft/TypeScript/issues/33232
    captureTracks = await JitsiMeetJS.createLocalTracks({devices:['desktop']})
    //  captureStream = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions)
  } catch (err) {
    console.error(`Share screen error: ${err}`)
    throw err

  }
  for (const track of captureTracks) { track.makeThisMainScreen() }
  //  console.log('got desktop track', captureTracks)

  return captureTracks as JitsiLocalTrack[]
}

function downloadItems(contents:SharedContents) {
  const content = JSON.stringify(contents.all)
  const blob = new Blob([content], {type: 'text/plain'})

  const a = document.createElement('a')
  const url = URL.createObjectURL(blob)
  a.href = url
  a.download = 'BinauralMeetSharedItems.json'
  document.body.appendChild(a)
  a.click()
  setTimeout(() => {
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  },         0)
}
function importItems(ev: React.ChangeEvent<HTMLInputElement>, sharedContents: SharedContents) {
  const files = ev.currentTarget?.files
  if (files && files.length) {
    files[0].text().then((text) => {
      //  console.log('import:', text)
      const items = JSON.parse(text)
      if (isArray(items)) {
        items.forEach((item) => {
          const content = item as ISharedContent
          if (content.type === 'screen') { return }
          const newContent = createContent()
          content.id = ''
          Object.assign(newContent, item)
          sharedContents.shareContent(newContent)
        })
      }
    })
  }
}

interface EntranceProps extends DialogPageProps {
}

export const Entrance: React.FC<EntranceProps> = (props) => {
  const {
    setStep,
  } = props
  const sharedContents = useContentsStore()
  const participants = useParticipantsStore()
  const map = useMapStore()
  const sharing = useObserver(() => (
    {main: sharedContents.tracks.localMains.size, contents: sharedContents.tracks.localContents.size}))
  const showMouse = useObserver(() => participants.local.mouse.show)
  const fileInput = useRef<HTMLInputElement>(null)

  return (
    <List>
      <input type="file" accept="application/json" ref={fileInput} style={{display:'none'}}
        onChange={
          (ev) => {
            setStep('none')
            importItems(ev, sharedContents)
          }
       }
      />
      <ShareDialogItem
        key="shareImport" icon={<UploadIcon />}
        text="Import shared items from file"
        onClick={() => { fileInput.current?.click() }}
      />
      <ShareDialogItem
        key="shareDownload"
        icon={<DownloadIcon />}
        text="Download shared items as a file"
        onClick={() => {
          setStep('none')
          downloadItems(sharedContents)
        }}
      />
      <Divider />
      <ShareDialogItem
        key="shareIframe"
        icon={<HttpIcon />}
        text="Iframe"
        onClick={() => setStep('iframe')}
      />
      <ShareDialogItem
        key="shareText"
        icon={<SubjectIcon />}
        text="Text"
        onClick={() => setStep('text')}
      />
      <ShareDialogItem
        key="shareImage"
        icon={<ImageIcon />}
        text="Image"
        onClick={() => setStep('image')}
      />
      <Divider />
      <ShareDialogItem
        key="shareScreen"
        icon={sharing.main ? <StopScreenShareIcon /> : <ScreenShareIcon />}
        text={sharing.main ? 'Stop background screen' : 'Screen as the background'}
        onClick={() => {
          if (sharing.main) {
            sharedContents.tracks.clearLocalMains()
          } else {
            startCapture().then(tracks => sharedContents.tracks.addLocalMains(tracks))
          }
          setStep('none')
        }}
      />
      <ShareDialogItem
        key="shareScreenContent"
        icon={<OpenInBrowserIcon />}
        text={'Screen in a window'}
        onClick={() => {
          startCapture().then((tracks) => {
            const content = createContentOfVideo(tracks, map)
            sharedContents.shareContent(content)
            assert(content.id)
            tracks.forEach(track => track.videoType = content.id)
            sharedContents.tracks.addLocalContents(tracks)
          })
          setStep('none')
        }}
      />
      <ShareDialogItem
        key="shareMouse"
        icon={<Icon icon={cursorDefaultOutline} />}
        text={showMouse ?  'Stop sharing mouse cursor' : 'Mouse cursor'}
        onClick={() => {
          participants.local.mouse.show = !showMouse
          setStep('none')
        }}
      />
    </List>
  )
}
Entrance.displayName = 'Entrance'
