import {makeStyles} from '@material-ui/core/styles'
import {ISharedContent} from '@models/ISharedContent'
import {assert, mulV2} from '@models/utils'
import sharedContents from '@stores/sharedContents/SharedContents'
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
  locals: MediaStreamTrack[]
  remotes: MediaStreamTrack[]
  content: ISharedContent
}

export const ScreenContent: React.FC<ContentProps> = (props:ContentProps) => {
  assert(props.content.type === 'screen' || props.content.type === 'camera')
  const classes = useStyles()
  const ref = useRef<HTMLVideoElement>(null)
  const [muted, setMuted] = React.useState(false)
  const member = useRef<ScreenContentMember>({} as ScreenContentMember)
  member.current = {
/*TODO:
    locals: useObserver<MediaStreamTrack[]>(() =>
      Array.from(sharedContents.tracks.localContents.get(props.content.id) || [])),
    remotes: useObserver<MediaStreamTrack[]>(() =>
      Array.from(sharedContents.tracks.remoteContents.get(props.content.id) || [])),*/
      locals: [] as MediaStreamTrack[],
      remotes: [] as MediaStreamTrack[],
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
    assert(member.current.locals.length===0 || member.current.remotes.length===0)
    if (ref.current) {
      const ms = new MediaStream()
      member.current.locals.forEach((track) => {
        if (track.kind !== 'audio') { //  Never play local audio. It makes echo.
          ms.addTrack(track)
        }
      })
      member.current.remotes.forEach((track) => {
        if (track.kind !== 'audio') { //  Remote audio is played by ConnectedMananger
          ms.addTrack(track)
          const onMuteLater = _.debounce(()=>{setMuted(true)}, 3000)
          track.onmute = onMuteLater
          track.onunmute = () => {
            onMuteLater.cancel()
            setMuted(false)
          }
        }
      })

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
  //  const simulcastRatios = [0.25, 0.5, 0.75, 4.0 / 3, 2, 4]
  const simulcastRatios:number[] = []
  function checkVideoSize() {
    if (member.current.locals.length && ref.current) {
      const tracks = ref.current.srcObject instanceof MediaStream && ref.current.srcObject.getTracks()
      if (tracks && tracks.length) {
        const video = tracks.find(track => track.kind === 'video')
        const settings = video?.getSettings()
        const newSize = [settings?.width || 0, settings?.height || 0] as [number, number]
        if (newSize[0] && member.current.content.originalSize.toString() !== newSize.toString()) {
          if (member.current.content.originalSize[0]){
            const sx = member.current.content.originalSize[0] / newSize[0]
            const sy = member.current.content.originalSize[1] / newSize[1]
            if (sx === sy && simulcastRatios.find(s => s === sx)) { return }
          }
          const scale = member.current.content.size[0] /
            (member.current.content.originalSize[0] ? member.current.content.originalSize[0] : newSize[0])
          member.current.content.originalSize = newSize
          member.current.content.size = mulV2(scale, newSize)
          props.updateAndSend(member.current.content)
        }
      }
    }
  }
  useEffect(() => {
    setTrack()
  },        [member.current.locals, member.current.remotes])
  useEffect(() => {
    const interval = setInterval(checkVideoSize, 333)   //  Notification of exact video size may take time.

    return () => clearInterval(interval)
  })

  return <video className={classes.video} style={muted ? {filter: 'brightness(80%) sepia(25%)'} : {}} ref={ref} />
}
