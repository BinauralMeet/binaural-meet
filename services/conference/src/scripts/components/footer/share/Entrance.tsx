import List from '@material-ui/core/List'
import HttpIcon from '@material-ui/icons/Http'
import ImageIcon from '@material-ui/icons/Image'
import ScreenShareIcon from '@material-ui/icons/ScreenShare'
import SubjectIcon from '@material-ui/icons/Subject'
import {shareMainScreenStream} from '@models/share/shareScreenStream'
import JitsiMeetJS, {JitsiLocalTrack} from 'lib-jitsi-meet'
import React from 'react'
import {DialogPageProps} from './DialogPage'
import {ShareDialogItem} from './SharedDialogItem'

interface EntranceProps extends DialogPageProps {
}

export const Entrance: React.FC<EntranceProps> = (props) => {
  const {
    setStep,
  } = props

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
        key="shareScreen"
        icon={<ScreenShareIcon />}
        text="Screen"
        onClick={() => {
          startCapture().then(shareMainScreenStream)
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
  console.log('got desktop track', captureTracks)

  return captureTracks as JitsiLocalTrack[]
}
