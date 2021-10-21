import {BMProps} from '@components/utils'
import {makeStyles} from '@material-ui/core'
import TraceablePeerConnection from 'lib-jitsi-meet/modules/RTC/TraceablePeerConnection'
import _ from 'lodash'
import {useObserver} from 'mobx-react-lite'
import React, {useEffect, useRef, useState} from 'react'

declare const d:any                  //  from index.html

const useStyles = makeStyles({
  videoContainer: {
    height: '100%',
    width: '100%',
    backgroundColor: 'none',
  },
  video:{
    marginLeft: 'auto',
    marginRight: 'auto',
    display: 'block',
    //  height: '100%',
    width: '100%',
  },
})

const setStream = (
  video: HTMLVideoElement,
  stream: MediaStream | null,
  ) => {
  video.srcObject = stream
  video.autoplay = true
}
export interface MainScreenProps extends BMProps{
  showAllTracks?:boolean
}

export const MainScreen: React.FC<MainScreenProps> = (props) => {
  const classes = useStyles()
  const stream = useObserver(() => (props.stores.contents.tracks.mainStream))
  const videoRef = useRef<HTMLVideoElement>(null)
  useEffect(
    () => {
      if (videoRef && videoRef.current) {
        setStream(videoRef.current, stream ? stream : null)
      }
    },
    [stream],
  )
  //  for showAllTracks (or DEBUG_VIDEO) ---------------------------------------
  interface DebugVideo{
    stream: MediaStream
    label: string
    color: string
  }
  const [debugVideos, setDebugVideos] = useState<DebugVideo[]>()
  const member = useRef<any>({})
  member.current.debugVideos = debugVideos
  const refs = useRef<React.RefObject<HTMLVideoElement>[]>([])

  if (props.showAllTracks) {
    while (refs.current.length < (debugVideos ? debugVideos.length : 0)) {
      refs.current.push(React.createRef<HTMLVideoElement>())
    }
    refs.current.forEach((ref, idx) => {
      if (ref.current && debugVideos && idx < debugVideos.length) {
        setStream(ref.current, debugVideos[idx].stream)
        //  console.log(`setStream for ${idx} ${ref.current}`)
      }
    })
  }
  useEffect(
    () => {
      if (props.showAllTracks) {
        const INTERVAL = 1000
        if (member.current?.interval){
          clearInterval(member.current.interval)
          member.current.interval = undefined
        }
        member.current.interval = setInterval(() => {
          const tpc = d.tpc as TraceablePeerConnection
          if (!tpc || !tpc.peerconnection) { return }

          const newVideos:DebugVideo[] = []
          const localStreams = new Set((tpc.peerconnection as any).getLocalStreams() as MediaStream[])
          const remoteStreams = new Set((tpc.peerconnection as any).getRemoteStreams() as MediaStream[])
          tpc.localTracks.forEach((track, id) => {
            const stream = track.getOriginalStream()
            const ok = localStreams.delete(stream)
            newVideos.push({
              stream,
              // tslint:disable-next-line: prefer-template
              label: `Local ssrc:${tpc.getLocalSSRC(track)}\ntype:${track.getType()}\n`
              + `videoType:${track.videoType}\nmsid:${stream?.id}`
              + (ok ? 'OK' : ' NOT in pc'),
              color:'blue',
            })
          })

          for (const stream of localStreams.values()) {
            newVideos.push({
              stream,
              // tslint:disable-next-line: prefer-template
              label: `Local X msid:${stream?.id}`,
              color:'red',
            })
          }

          tpc.remoteTrackMaps.forEach((remoteTrackMap) => {
            remoteTrackMap.forEach((track, id) => {
              const stream = track.getOriginalStream()
              const ok = remoteStreams.delete(stream)
              newVideos.push({
                stream,
                // tslint:disable-next-line: prefer-template
                label: `Remote ssrc:${track.getSSRC()}\ntype:${track.getType()}\n`
                + `videoType:${track.videoType}\nmsid:${stream?.id}`
                + (ok ? 'OK' : ' NOT in pc'),
                color:'red',
              })
            })
          })

          for (const stream of remoteStreams.values()) {
            newVideos.push({
              stream,
              // tslint:disable-next-line: prefer-template
              label: `Remote X msid:${stream?.id}`,
              color:'blue',
            })
          }

          const elementFlags = refs.current.map(e => e ? true : false)
          if (!_.isEqual(member.current.elementFlags, elementFlags)
            || !_.isEqual(member.current.debugVideos, newVideos)) {
            // console.log(member.current.debugVideos, newVideos)
            setDebugVideos(newVideos)
            member.current.elementFlags = _.cloneDeep(elementFlags)
          }
        },                                    INTERVAL)
      }else {
        if (member.current?.interval) {
          clearInterval(member.current.interval)
          member.current.interval = undefined
        }
      }
    },
    [props.showAllTracks],
  )

  const videos = (props.showAllTracks && debugVideos) ? debugVideos.map((debugVideo, idx) =>
    <div key={idx} style={{display:'inline-block', position:'relative', verticalAlign:'top'}}>
      <video style={{width:300}} ref={refs.current[idx]} />
      <div style={{position:'absolute', left:0, top:0,
        color:debugVideo.color, whiteSpace: 'pre-wrap'}}>
        {debugVideo.label}
      </div>
    </div>,
    ) : undefined
  //  -----------------------------------------------------------------------

  return (
    <div className={classes.videoContainer} >
      <video ref={videoRef} className={classes.video} style={{visibility : stream ? 'visible' : 'hidden'} } />
      <div style={{position:'absolute', left:0, top:0}}>
        {videos /* for DEBUG_VIDEO */}
      </div>
    </div>
  )
}
MainScreen.displayName = 'MainScreen'
