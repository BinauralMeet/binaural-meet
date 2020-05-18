import {ConnectionStates, Logger, Connection} from '@models/api'
import {dummyConnectionStore as store, StoreProvider, useStore} from '@test-utils/DummyParticipants'
import {useObserver} from 'mobx-react-lite'
import React, {useEffect, useRef, useState} from 'react'
import Card from '@material-ui/core/Card'
import CardContent from "@material-ui/core/CardContent";
import CardHeader from '@material-ui/core/CardHeader'
import Grid from "@material-ui/core/Grid";
import { Button, ButtonGroup, TableRow, TableContainer, Table, TableBody, CircularProgress } from '@material-ui/core'
import { init as initWorker, worker, resetWorker } from '@test-utils/worker'
import { FastForward } from '@material-ui/icons'


export default {
  title: 'Dummy Connection',
}

const logger = Logger.default.setHandler('DummyStories')

interface ExtendedHTMLVideoElement extends HTMLVideoElement {
  captureStream?: () => MediaStream
  mozCaptureStream?: () => MediaStream
}

// const RemoteVideo: React.FC<{}> = () => {
//   const remoteConnection
// }


// const LocalVideo: React.FC<{}> = () => {
//   const dummyConnectionStore = useStore()
//   const localVideoEl = useRef<ExtendedHTMLVideoElement>(null)
//   const callbackOnLoadedData = () => {
//     let stream: MediaStream

//     if (localVideoEl.current?.captureStream) {
//       stream = localVideoEl.current?.captureStream()
//     } else if (localVideoEl.current?.mozCaptureStream) {
//       stream = localVideoEl.current?.mozCaptureStream()
//     } else {
//       throw new Error('captureStream() is undefined.')
//     }

//     logger?.log('got a new stream.')
//     connection.createJitisLocalTracksFromStream(stream)
//       .then((tracks) => {
//         connection.addTracks(tracks)
//         connection.joinConference('haselabtest')
//       })
//   }

//   useEffect(
//     () => {
//       try {
//         if (connection.state === ConnectionStates.DISCONNECTED) {
//           connection.init()
//         }
//       } catch {
//         logger?.log('Something is wrong.')
//       }
//     },
//     [],
//   )
//   const videoEl = (
//     <div id="dummy_video_container">
//       <video
//         id="dummy_video"
//         ref={localVideoEl}
//         onLoadedData={connection.state === ConnectionStates.CONNECTED ? callbackOnLoadedData : undefined}
//         controls={true} loop={true} autoPlay={true}>
//         <source src="video/chrome.mp4" type="video/mp4" />
//       </video>
//     </div>
//   )
//   const displayEl = useObserver(
//     () => (
//       <div>
//         <p>Dummy Connection: {`${dummyConnectionStore.state}`}</p>
//         {dummyConnectionStore.state === ConnectionStates.CONNECTED ? videoEl : null}
//       </div>
//     ),
//   )

//   return displayEl
// }

interface IDummyParticipant {
  participantId: number,
  participantState: boolean,
  url?: string,
  connection?: Connection,
}

const DummyParticipantVisualizer: React.FC<{}> = () => {
  // const [participants, setParticipants] = useState<number[]>([])
  // const [participantStates, setParticipantStates] = useState<boolean[]>([])
  // const [videoElements, setMount] = useState<JSX.Element[]>([])

  const [dummies, setDummies] = useState<IDummyParticipant[]>([])

  const handleAddOnClick = () => {
    dummies.push({
      participantId: dummies.length + 1,
      participantState: false,
    })

    setDummies([...dummies])

    // const currParticipants = [...participants]
    // currParticipants.push(currParticipants.length + 1)
    // participantStates.push(false)
    // setParticipants(currParticipants)
    // setParticipantStates(participantStates)
  }
  const handleDeleteOnClick = () => {
    dummies.pop()

    setDummies([...dummies])

    // const currParticipants = [...participants]
    // currParticipants.pop()
    // participantStates.pop()
    // setParticipants(currParticipants)
    // setParticipantStates(participantStates)
  }
  const controls = (
    <div id="controls_container">
      <ButtonGroup>
        <Button onClick={handleAddOnClick}>Add participant</Button>
        <Button onClick={handleDeleteOnClick}>Delete last participant</Button>
      </ButtonGroup>
    </div>
  )
  // const elements = participants.map(
  //   (value: number, index: number) => {
  //     return (
  //       <Card key={value}>
  //         <CardHeader title={`Pariticipant ${value}`} />
  //         <CardContent>
  //           {participantStates[index] ? videoElements[index] : <CircularProgress /> }
  //         </CardContent>
  //       </Card>
  //     )
  //   },
  // )
  const elements = dummies.map(
    (p: IDummyParticipant, index: number) => {
      return (
        <Card key={p.participantId}>
          <CardHeader title={`Pariticipant ${p.participantId}`} />
          <CardContent>
            {p.participantState ? <Video url={p.url as string} connection={p.connection as Connection}/> : <CircularProgress /> }
          </CardContent>
        </Card>
      )
    },
  )

  useEffect(
    () => {
      dummies.map(
        (p: IDummyParticipant, index: number) => {
          if (!p.participantState) {
            const connection = new Connection(`Participant${p.participantId}Connection`, true)

            connection.init().then(
              () => {
                initWorker(`Participant ${p.participantId}`).then(
                  (ret) => {
                    const webm = ret
                    const blob = new Blob([webm], {type: 'video/webm'})
                    const url = URL.createObjectURL(blob)

                    worker.terminate()
                    resetWorker()

                    p.participantState = true
                    p.connection = connection
                    p.url = url
                    dummies[index] = {...p}

                    setDummies([...dummies])
                    // videoElements.push(videoEl)
                    // participantStates[index] = true

                    // setMount([...videoElements])
                    // setParticipantStates([...participantStates])
                  },
                )
              },
            )
          }
        },
      )
    },
  )

  return (
    <div>
      {controls}
      <Grid container={true} spacing={3}>
        {elements}
      </Grid>
    </div>
  )
}

interface IVideoProps {
  url: string
  connection: Connection
}

const Video: React.FC<IVideoProps> = (props: IVideoProps) => {
  const videoElRef = useRef<ExtendedHTMLVideoElement>(null)
  const callbackOnLoadedData = () => {
    let stream: MediaStream

    if (videoElRef.current?.captureStream) {
      stream = videoElRef.current?.captureStream()
    } else if (videoElRef.current?.mozCaptureStream) {
      stream = videoElRef.current?.mozCaptureStream()
    } else {
      throw new Error('captureStream() is undefined.')
    }

    logger?.log('got a new stream.')
    props.connection.createJitisLocalTracksFromStream(stream)
      .then((tracks) => {
        props.connection.joinConference('haselabtest')
        props.connection.addTracks(tracks)
      })
  }
  const videoEl = (
    <video
      id="dummy_video"
      ref={videoElRef}
      loop={true} autoPlay={true} controls={true}
      onLoadedData={callbackOnLoadedData}>
      <source src={props.url} />
    </video>
  )

  return videoEl
}

export const DummyConnection: React.FC<{}> = () => {
  return (
    <div>
      <DummyParticipantVisualizer />
    </div>
    // <StoreProvider value={store}>
    //   <LocalVideo />
    // </StoreProvider>
  )
}
