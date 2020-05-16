import {dummyConnection as connection, ConnectionStates, Logger} from '@models/api'
import {dummyConnectionStore as store, StoreProvider, useStore} from '@test-utils/DummyParticipants'
import {useObserver} from 'mobx-react-lite'
import React, {useEffect, useRef, useState} from 'react'
import Card from '@material-ui/core/Card'
import CardContent from "@material-ui/core/CardContent";
import CardHeader from '@material-ui/core/CardHeader'
import Grid from "@material-ui/core/Grid";
import { Button, ButtonGroup, TableRow, TableContainer, Table, TableBody, CircularProgress } from '@material-ui/core'
import { init, worker, resetWorker } from '@test-utils/worker'


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


const LocalVideo: React.FC<{}> = () => {
  const dummyConnectionStore = useStore()
  const localVideoEl = useRef<ExtendedHTMLVideoElement>(null)
  const callbackOnLoadedData = () => {
    let stream: MediaStream

    if (localVideoEl.current?.captureStream) {
      stream = localVideoEl.current?.captureStream()
    } else if (localVideoEl.current?.mozCaptureStream) {
      stream = localVideoEl.current?.mozCaptureStream()
    } else {
      throw new Error('captureStream() is undefined.')
    }

    logger?.log('got a new stream.')
    connection.createJitisLocalTracksFromStream(stream)
      .then((tracks) => {
        return connection.joinConference(tracks)
      })
  }

  useEffect(
    () => {
      try {
        if (connection.state === ConnectionStates.Disconnected) {
          connection.init()
        }
      } catch {
        logger?.log('Something is wrong.')
      }
    },
    [],
  )
  const videoEl = (
    <div id="dummy_video_container">
      <video
        id="dummy_video"
        ref={localVideoEl}
        onLoadedData={connection.state === ConnectionStates.Connected ? callbackOnLoadedData : undefined}
        controls={true} loop={true} autoPlay={true}>
        <source src="video/chrome.mp4" type="video/mp4" />
      </video>
    </div>
  )
  const displayEl = useObserver(
    () => (
      <div>
        <p>Dummy Connection: {`${dummyConnectionStore.state}`}</p>
        {dummyConnectionStore.state === ConnectionStates.Connected ? videoEl : null}
      </div>
    ),
  )

  return displayEl
}

const DummyParticipantVisualizer: React.FC<{}> = () => {
  const [participants, setParticipants] = useState<number[]>([])
  const [participantStates, setParticipantStates] = useState<boolean[]>([])
  const [videoElements, setMount] = useState<JSX.Element[]>([])

  const handleAddOnClick = () => {
    const currParticipants = [...participants]
    currParticipants.push(currParticipants.length + 1)
    participantStates.push(false)
    setParticipants(currParticipants)
    setParticipantStates(participantStates)
  }
  const handleDeleteOnClick = () => {
    const currParticipants = [...participants]
    currParticipants.pop()
    participantStates.pop()
    setParticipants(currParticipants)
    setParticipantStates(participantStates)
  }
  const controls = (
    <div id="controls_container">
      <ButtonGroup>
        <Button onClick={handleAddOnClick}>Add participant</Button>
        <Button onClick={handleDeleteOnClick}>Delete last participant</Button>
      </ButtonGroup>
    </div>
  )
  const elements = participants.map(
    (value: number, index: number) => {
      return (
        <Card key={value}>
          <CardHeader title={`Pariticipant ${value}`} />
          <CardContent>
            {participantStates[index] ? videoElements[index] : <CircularProgress /> }
          </CardContent>
        </Card>
      )
    },
  )

  useEffect(
    () => {
      participantStates.map(
        (state: boolean, index: number) => {
          if (!state) {
            init(`Participants${participants[index]}`).then(
              (ret) => {
                const webm = ret
                const blob = new Blob([webm], {type: 'video/webm'})
                const url = URL.createObjectURL(blob)

                const videoEl = (
                  <video id="dummy_video" loop={true} autoPlay={true} controls={true}>
                    <source src={url} />
                  </video>
                )

                worker.terminate()
                resetWorker()

                videoElements.push(videoEl)
                participantStates[index] = true

                setMount([...videoElements])
                setParticipantStates([...participantStates])
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
