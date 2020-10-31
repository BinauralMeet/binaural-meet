import {makeStyles} from '@material-ui/core/styles'
import {assert} from '@models/utils'
import sharedContents from '@stores/sharedContents/SharedContents'
import {JitsiLocalTrack, JitsiRemoteTrack} from 'lib-jitsi-meet'
import _ from 'lodash'
import {useObserver} from 'mobx-react-lite'
import React, {useEffect, useRef} from 'react'
import {ContentProps} from './Content'

const useStyles = makeStyles({
  video: {
    width: '100%',
    height: '100%',
  },
})

interface ScreenContentMember{
  locals: Map<string, Set<JitsiLocalTrack>>
  remotes: Map<string, Set<JitsiRemoteTrack>>
}

export const ScreenContent: React.FC<ContentProps> = (props:ContentProps) => {
  assert(props.content.type === 'screen')
  const classes = useStyles()
  const ref = useRef<HTMLVideoElement>(null)
  const member = useRef<ScreenContentMember>({} as ScreenContentMember)
  member.current = {
    locals: useObserver<Map<string, Set<JitsiLocalTrack>>>(() => sharedContents.tracks.localContents),
    remotes: useObserver<Map<string, Set<JitsiRemoteTrack>>>(() => sharedContents.tracks.remoteContents),
  }

  function setTrack() {
    if (ref.current) {
      const ms = new MediaStream()
      member.current.locals.get(props.content.id)?.forEach(track => ms.addTrack(track.getTrack()))
      member.current.remotes.get(props.content.id)?.forEach(track => ms.addTrack(track.getTrack()))

      const old = ref.current.srcObject instanceof MediaStream && ref.current.srcObject.getTracks()
      const cur = ms.getTracks()
      if (cur.length) {
        if (! _.isEqual(old, cur)) {
          console.log('prev-next:', old, cur)
          ref.current.srcObject = ms
          ref.current.autoplay = true
        }
        const video = cur.find(track => track.kind === 'video')
        const settings = video?.getSettings()
        const newSize = [settings?.width || 0, settings?.height || 0] as [number, number]
        if (newSize[0] && props.content.originalSize.toString() !== newSize.toString()) {
          props.content.originalSize = newSize
          const ratio = newSize[0] / newSize[1]
          if (props.content.size[0] > ratio * props.content.size[1]) {
            props.content.size[0] = ratio * props.content.size[1]
          }else if (props.content.size[0] < ratio * props.content.size[1]) {
            props.content.size[1] = props.content.size[0] / ratio
          }
          const newContent = Object.assign({}, props.content)
          props.onUpdate?.call(null, newContent)
        }
      }
    }
  }
  useEffect(() => {
    setTimeout(setTrack, 100) //  Notify exact video size may take time.
  },
            [ref.current],
  )

  return <video className = {classes.video} ref = {ref} />
}
