import {useStore as useParticipantsStore} from '@hooks/ParticipantsStore'
import {useStore as useContentsStore} from '@hooks/SharedContentsStore'
import cursorDefaultOutline from '@iconify/icons-mdi/cursor-default-outline'
import {Icon} from '@iconify/react'
import List from '@material-ui/core/List'
import HttpIcon from '@material-ui/icons/Http'
import ImageIcon from '@material-ui/icons/Image'
import ScreenShareIcon from '@material-ui/icons/ScreenShare'
import StopScreenShareIcon from '@material-ui/icons/StopScreenShare'
import SubjectIcon from '@material-ui/icons/Subject'
import {shareMainScreenStream} from '@models/share/shareScreenStream'
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
  const store = useContentsStore()
  const participants = useParticipantsStore()
  const sharing = useObserver(() => (
    {main: store.localMainTracks.size, contents: store.localContentTracks.size}))
  const mousePosition = useObserver(() => participants.local.get().mousePosition)

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
        text={mousePosition ?  'Stop sharing mouse cursor' : 'Mouse cursor'}
        onClick={() => {
          participants.local.get().mousePosition =  mousePosition ? undefined
            : (global as any).mousePositionOnMap as [number, number]
        }}
      />
      <ShareDialogItem
        key="shareScreen"
        icon={sharing.main ? <StopScreenShareIcon /> : <ScreenShareIcon />}
        text={sharing.main ? 'Stop Screen' : 'Screen'}
        onClick={() => {
          if (sharing.main)  {
            for (const track of store.localMainTracks) {
              track.stopStream()
            }
            store.localMainTracks = new Set()
          } else {
            startCapture().then(shareMainScreenStream)
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
  console.log('got desktop track', captureTracks)

  return captureTracks as JitsiLocalTrack[]
}
