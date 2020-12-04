import {useStore as useMapStore} from '@hooks/MapStore'
import {useStore as useParticipantsStore} from '@hooks/ParticipantsStore'
import {useStore as useContentsStore} from '@hooks/SharedContentsStore'
import cursorDefaultOutline from '@iconify/icons-mdi/cursor-default-outline'
import {Icon} from '@iconify/react'
import List from '@material-ui/core/List'
import HttpIcon from '@material-ui/icons/Http'
import ImageIcon from '@material-ui/icons/Image'
import OpenInBrowserIcon from '@material-ui/icons/OpenInBrowser'
import ScreenShareIcon from '@material-ui/icons/ScreenShare'
import StopScreenShareIcon from '@material-ui/icons/StopScreenShare'
import SubjectIcon from '@material-ui/icons/Subject'
import {assert} from '@models/utils'
import {createContentOfVideo} from '@stores/sharedContents/SharedContentCreator'
import JitsiMeetJS, {JitsiLocalTrack} from 'lib-jitsi-meet'
import {useObserver} from 'mobx-react-lite'
import React from 'react'
import {DialogPageProps} from './DialogPage'
import {ShareDialogItem} from './SharedDialogItem'

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
  const showMouse = useObserver(() => participants.local.get().mouse.show)

  return (
    <List>
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
      <ShareDialogItem
        key="shareMouse"
        icon={<Icon icon={cursorDefaultOutline} />}
        text={showMouse ?  'Stop sharing mouse cursor' : 'Mouse cursor'}
        onClick={() => {
          participants.local.get().mouse.show = !showMouse
          setStep('none')
        }}
      />
      <ShareDialogItem
        key="shareScreenContent"
        icon={<OpenInBrowserIcon />}
        text={'Screen as a content'}
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
        key="shareScreen"
        icon={sharing.main ? <StopScreenShareIcon /> : <ScreenShareIcon />}
        text={sharing.main ? 'Stop Screen' : 'Screen'}
        onClick={() => {
          if (sharing.main) {
            sharedContents.tracks.clearLocalMains()
          } else {
            startCapture().then(tracks => sharedContents.tracks.addLocalMains(tracks))
          }
          setStep('none')
        }}
      />
    </List>
  )
}
Entrance.displayName = 'Entrance'

async function startCapture(displayMediaOptions: any = {}) {
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
