import React, { useEffect, useState } from 'react'
import { init, worker } from '../../../__tests__/utils/worker'

export default {
  title: 'WebWorker',
  // decorators: [withInfo],
}

export const WebmVideo: React.FC<{}> = () => {
  const [element, setMount] = useState<JSX.Element | undefined>(undefined)

  useEffect(
    () => {
      init()
      .then(
        (ret) => {
          const webm = ret
          const blob = new Blob([webm], {type: 'video/webm'})
          const url = URL.createObjectURL(blob)

          const videoEl = (
            <video id="dummy_video" loop={true} autoPlay={true} controls={true}>
              <source src={url} />
            </video>
          )
          /* const video = document.createElement('video')
          video.muted = true
          video.autoplay = true
          video.loop = true
          video.controls = true
          video.src = url
          document.body.append(video)
          video.play() */
          worker.terminate()
          setMount(videoEl)
        },
      )
      .catch(
        (msg: string) => {
          console.error(msg)
        },
      )
    },
    [],
  )

  return (
    <div id="container">
      {element}
    </div>
  )
}

