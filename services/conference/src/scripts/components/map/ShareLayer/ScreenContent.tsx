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

export const ScreenContent: React.FC<ContentProps> = (props:ContentProps) => {
  assert(props.content.type === 'screen')
  const classes = useStyles()
  const ref = useRef<HTMLVideoElement>(null)
  const locals = useObserver<Map<string, Set<JitsiLocalTrack>>>(() => sharedContents.tracks.localContents)
  const remotes = useObserver<Map<string, Set<JitsiRemoteTrack>>>(() => sharedContents.tracks.remoteContents)

  function setTrack() {
    if (ref.current) {
      const ms = new MediaStream()
      locals.get(props.content.id)?.forEach((track) => ms.addTrack(track.getTrack()))
      remotes.get(props.content.id)?.forEach((track) => ms.addTrack(track.getTrack()))
      ms.getTracks().forEach((track) => {
        track.onended = (ev) => {
          const pid = sharedContents.owner.get(props.content.id)
          if (pid) {
            sharedContents.removeContents(pid, [props.content.id])
          }else {
            console.error('track.onended can not remove content because pid is not found.')
          }
        }
      })
      if (! _.isEqual(ref.current.srcObject, ms)) {
        ref.current.srcObject = ms
        ref.current.autoplay = true
      }
    }
  }
  setTrack()

  useEffect(
    setTrack,
    [ref.current],
  )

  return <video className = {classes.video} ref = {ref} />
}
