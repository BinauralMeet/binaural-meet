import {ImageAvatar, StreamAvatar} from '@components/avatar'
import {Information} from '@models/Participant'
import {getRandomColor} from '@stores/utils'
import JitsiMeetJS from 'lib-jitsi-meet'
import React, {useEffect, useState} from 'react'

export default {
  title: 'Avatar',
}


const informationName: Information = {
  name: 'Hello World',
}
export const name = () => {
  const [color, fColor] = getRandomColor(informationName.name)

  return <ImageAvatar information={informationName} color={color} textColor={fColor} size={50} />
}

const informationEmal: Information = Object.assign({}, informationName, {
  md5Email: 'a50236395ddbb8acc4a3533f43da66b5',
})
export const gavatar = () => {
  const [color, fColor] = getRandomColor(informationName.name)

  return <ImageAvatar information={informationEmal} color={color} textColor={fColor} size={50} />
}

function captureVideo() {
  const [stream, setStream] = useState<MediaStream | undefined>(undefined)

  useEffect(
    () => {
      JitsiMeetJS.createLocalTracks({devices:['video']})
      .then((tracks) => {
        setStream(tracks[0].getOriginalStream())
      })
    },
    [],
  )

  return [stream]
}
export const video = () => {
  const [stream] = captureVideo()

  if (stream === undefined) {
    return <div />
  }

  return <StreamAvatar stream={stream} />
}
