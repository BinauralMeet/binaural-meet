import {useStore as useMapStore} from '@hooks/MapStore'
import {useStore as useParticipants} from '@hooks/ParticipantsStore'
import {useStore as useContents} from '@hooks/SharedContentsStore'
import MenuItem from '@material-ui/core/MenuItem'
import {assert} from '@models/utils'
import {createContentOfVideo} from '@stores/sharedContents/SharedContentCreator'
import JitsiMeetJS, {JitsiLocalTrack} from 'lib-jitsi-meet'
import {observable} from 'mobx'
import {useObserver} from 'mobx-react-lite'
import React, {useEffect} from 'react'
import {DialogPageProps} from './DialogPage'

export class CameraSelectorMember{
  @observable.shallow videos: MediaDeviceInfo[] = []
}
interface CameraSelectorProps extends DialogPageProps{
  cameras: CameraSelectorMember
}

export const CameraSelector: React.FC<CameraSelectorProps> = (props) => {
  const {
    setStep,
  } = props
  const contents = useContents()
  const map = useMapStore()
  const participants = useParticipants()
  const videoMenuItems = useObserver(() =>
    props.cameras.videos.map((info, idx) => makeMenuItem(info, closeVideoMenu, idx)))
  function makeMenuItem(info: MediaDeviceInfo, close:(did:string) => void, key:number):JSX.Element {
    let selected = false
    selected = info.deviceId === participants.local.devicePreference.videoInputDevice
    const keyStr = String.fromCharCode(65 + key)

    return <MenuItem key={info.deviceId} onClick={() => { close(info.deviceId) }} >
        { `${keyStr}\u00A0${(selected ? '🙂\u00A0' : '\u00A0\u00A0\u2003')}${info.label}` }
      </MenuItem>  //  \u00A0: NBSP, u2003: EM space.
  }
  function closeVideoMenu(did:string) {
    setStep('none')
    if (did) {
      JitsiMeetJS.createLocalTracks({devices:['video'],
        cameraDeviceId: did}).then((tracks: JitsiLocalTrack[]) => {
          if (tracks.length) {
            const content = createContentOfVideo(tracks, map, 'camera')
            contents.shareContent(content)
            assert(content.id)
            contents.tracks.addLocalContents(content.id, tracks)
          }
        },
      )
    }
  }

  //  keyboard shortcut
  useEffect(() => {
    const onKeyPress = (e: KeyboardEvent) => {
      if (e.code.substr(0, 3) === 'Key') {
        const keyNum = e.code.charCodeAt(3) - 65
        closeVideoMenu(props.cameras.videos[keyNum]?.deviceId)
      }
    }
    window.addEventListener('keypress', onKeyPress)

    return () => {
      window.removeEventListener('keypress', onKeyPress)
    }
  },        [])


  return <>
    {videoMenuItems}
  </>
}
CameraSelector.displayName = 'CameraSelector'
