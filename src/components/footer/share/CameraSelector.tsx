import MenuItem from '@material-ui/core/MenuItem'
import {createContentOfVideo} from '@stores/sharedContents/SharedContentCreator'
import {makeObservable, observable} from 'mobx'
import {useObserver} from 'mobx-react-lite'
import React, {useEffect} from 'react'
import {DialogPageProps} from './Step'
import {createLocalCamera} from '@models/conference/faceCamera'
import {conference} from '@models/conference'
import { dialogStyle } from '@components/utils'

export class CameraSelectorMember{
  @observable.shallow videos: MediaDeviceInfo[] = []
  constructor(){
    makeObservable(this)
  }
}
interface CameraSelectorProps extends DialogPageProps{
  cameras: CameraSelectorMember
}

export const CameraSelector: React.FC<CameraSelectorProps> = (props) => {
  const {setStep} = props
  const {contents, map, participants} = props.stores
  const videoMenuItems = useObserver(() =>
    props.cameras.videos.map((info, idx) => makeMenuItem(info, closeVideoMenu, idx)))
  function makeMenuItem(info: MediaDeviceInfo, close:(did:string) => void, key:number):JSX.Element {
    let selected = false
    selected = info.deviceId === participants.local.devicePreference.videoinput
    const keyStr = String.fromCharCode(65 + key)

    return <MenuItem key={info.deviceId} style={dialogStyle} onClick={() => { close(info.deviceId) }} >
        { `${keyStr}\u00A0${(selected ? '🙂\u00A0' : '\u00A0\u00A0\u2003')}${info.label}` }
      </MenuItem>  //  \u00A0: NBSP, u2003: EM space.
  }
  function closeVideoMenu(did:string) {
    setStep('none')
    if (did) {
      createLocalCamera(false, did).then((msTrack)=>{
        const content = createContentOfVideo([msTrack.track], map, 'screen')
        contents.assignId(content)
        msTrack.role = content.id
        contents.getOrCreateContentTracks(conference.rtcTransports.peer, content.id)
        contents.shareContent(content)
        conference.addOrReplaceLocalTrack(msTrack)
      })
    }
  }

  //  keyboard shortcut
  useEffect(() => {
    const onKeyPress = (e: KeyboardEvent) => {
      if (e.code.substring(0, 3) === 'Key') {
        const keyNum = e.code.charCodeAt(3) - 65
        closeVideoMenu(props.cameras.videos[keyNum]?.deviceId)
      }
    }
    window.addEventListener('keypress', onKeyPress)

    return () => {
      window.removeEventListener('keypress', onKeyPress)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },        [])


  return <>
    {videoMenuItems}
  </>
}
CameraSelector.displayName = 'CameraSelector'
