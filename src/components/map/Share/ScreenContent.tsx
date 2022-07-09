import {makeStyles} from '@material-ui/core/styles'
import {ISharedContent} from '@models/ISharedContent'
import {assert, mulV2} from '@models/utils'
import contents from '@stores/sharedContents/SharedContents'
import { autorun } from 'mobx'
import React, {useEffect, useRef} from 'react'
import {ContentProps} from './Content'

const useStyles = makeStyles({
  video: {
    width: '100%',
    height: '100%',
  },
})

interface ScreenContentMember{
  tracks: MediaStreamTrack[]
  content: ISharedContent
}

export const ScreenContent: React.FC<ContentProps> = (props:ContentProps) => {
  assert(props.content.type === 'screen' || props.content.type === 'camera')
  const classes = useStyles()
  const ref = useRef<HTMLVideoElement>(null)
  const [muted, setMuted] = React.useState(false)
  const member = useRef<ScreenContentMember>({} as ScreenContentMember)

  const simulcastRatios = [0.25, 0.5, 0.75, 4.0 / 3, 2, 4]
  //const simulcastRatios:number[] = []
  useEffect(() => {
    //  Create tracks.
    if (!member.current?.tracks){
      member.current = {
        tracks: contents.getOrCreateContentTracks('', props.content.id).tracks,
        content: props.content,
      }
      if (member.current.tracks.length > 2) {
        console.error(`content ${props.content.id} has ${member.current.tracks.length} tracks`, member.current.tracks)
      }
    }
    //  Observe tracks and update
    const disposer = autorun(()=>{
      if (ref.current) {
        const track = member.current.tracks.find(t => t.kind === 'video')
        if (track){
          const oldTrack = ref.current.srcObject instanceof MediaStream ? ref.current.srcObject.getVideoTracks()[0] : undefined
          if (oldTrack !== track) {
            const ms = new MediaStream()
            ms.addTrack(track)
            let timer = 0
            track.onmute = () => {
              timer = window.setTimeout(()=>{setMuted(true)}, 5000)
              //console.log('video muted.')
            }
            track.onunmute = () => {
              if (timer){
                window.clearTimeout(timer)
                timer = 0
              }
              setMuted(false)
              //console.log('video unmuted.')
            }
            ref.current.srcObject = ms
            ref.current.autoplay = true
          }
        }
      }
    })
    return ()=>{
      disposer()
    }
  //  eslint-disable-next-line  react-hooks/exhaustive-deps
  }, [])
  useEffect(() => {
    function checkVideoSize() {
      if (member.current.tracks.length && ref.current) {
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
    const interval = setInterval(checkVideoSize, 333)   //  Notification of exact video size may take time.
    return () => clearInterval(interval)
  //  eslint-disable-next-line  react-hooks/exhaustive-deps
  }, [])

  return <video className={classes.video} style={muted ? {filter: 'brightness(80%) sepia(25%)'} : {}} ref={ref} />
}
