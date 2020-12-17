import {makeStyles} from '@material-ui/core/styles'
import {SharedContent} from '@models/SharedContent'
import {assert, mulV2} from '@models/utils'
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
  locals: JitsiLocalTrack[]
  remotes: JitsiRemoteTrack[]
  content: SharedContent
}

export const ScreenContent: React.FC<ContentProps> = (props:ContentProps) => {
  assert(props.content.type === 'screen')
  const classes = useStyles()
  const ref = useRef<HTMLVideoElement>(null)
  const member = useRef<ScreenContentMember>({} as ScreenContentMember)
  member.current = {
    locals: useObserver<JitsiLocalTrack[]>(() =>
      Array.from(sharedContents.tracks.localContents.get(props.content.id) || [])),
    remotes: useObserver<JitsiRemoteTrack[]>(() =>
      Array.from(sharedContents.tracks.remoteContents.get(props.content.id) || [])),
    content: props.content,
  }
  if (member.current.locals.length > 2) {
    console.error(`content ${props.content.id} has ${member.current.locals.length} local tracks`, member.current.locals)
  }
  if (member.current.remotes.length > 2) {
    console.error(
      `content ${props.content.id} has ${member.current.remotes.length} remote tracks`, member.current.remotes)
  }

  function setTrack() {
    if (ref.current) {
      const ms = new MediaStream()
      member.current.locals.forEach((track) => {
        if (track.getType() !== 'audio'){ //  Never play local audio. It makes echo.
          ms.addTrack(track.getTrack())
        }
      })
      member.current.remotes.forEach(track => ms.addTrack(track.getTrack()))

      const old = ref.current.srcObject instanceof MediaStream && ref.current.srcObject.getTracks()
      const cur = ms.getTracks()
      if (cur.length) {
        if (! _.isEqual(old, cur)) {
          //  console.log('prev-next:', old, cur)
          ref.current.srcObject = ms
          ref.current.autoplay = true
        }
      }
    }
  }
  setTrack()

  function checkVideoSize() {
    if (ref.current) {
      const tracks = ref.current.srcObject instanceof MediaStream && ref.current.srcObject.getTracks()
      if (tracks && tracks.length) {
        const video = tracks.find(track => track.kind === 'video')
        const settings = video?.getSettings()
        const newSize = [settings?.width || 0, settings?.height || 0] as [number, number]
        if (newSize[0] && member.current.content.originalSize.toString() !== newSize.toString()) {
          const scale = member.current.content.size[0] / member.current.content.originalSize[0]
          member.current.content.originalSize = newSize
          member.current.content.size = mulV2(scale, newSize)
          const newContent = Object.assign({}, member.current.content)
          props.onUpdate?.call(null, newContent)
        }
      }
    }
  }
  useEffect(() => {
    setTrack()
    const interval = setInterval(checkVideoSize, 333)   //  Notify of exact video size may take time.

    return () => clearInterval(interval)
  },
            [ref.current],
  )

  return <video className = {classes.video} ref = {ref} />
}
