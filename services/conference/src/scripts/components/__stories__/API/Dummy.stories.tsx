import {ConnectionStates, Logger} from '@models/api'
import {dummyConnection as connection, dummyConnectionStore as store, StoreProvider, useStore} from '@test-utils/DummyParticipants'
import {useObserver} from 'mobx-react-lite'
import React, {useEffect, useRef} from 'react'

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
  const callbackOncanPlay = () => {
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
        connection.init()
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
        onCanPlay={callbackOncanPlay}
        playsInline={true} controls={true} muted={true}>
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

export const DummyConnection: React.FC<{}> = () => {
  return (
    <StoreProvider value={store}>
      <LocalVideo />
    </StoreProvider>
  )
}
