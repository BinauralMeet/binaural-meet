import {ImageAvatar, StreamAvatar} from '@components/avatar'
import {Information} from '@models/Participant'
import JitsiMeetJS, {JitsiTrack} from 'lib-jitsi-meet'
import React, {useEffect, useState} from 'react'

export default {
  title: 'Avatar',
}


const informationName: Information = {
  name: 'Hello World',
}
export const name = () => {
  return <ImageAvatar information={informationName} />
}

const informationEmal: Information = Object.assign({}, informationName, {
  md5Email: 'a50236395ddbb8acc4a3533f43da66b5',
})
export const gavatar = () => {
  return <ImageAvatar information={informationEmal} />
}

function captureVideo() {
  const [track, setTrack] = useState<JitsiTrack | undefined>(undefined)

  useEffect(
    () => {
      JitsiMeetJS.createLocalTracks({devices:['video']})
      .then((tracks) => {
        setTrack(tracks[0])
      })
    },
    [],
  )

  return [track]
}
export const video = () => {
  const [track] = captureVideo()

  if (track === undefined) {
    return <div />
  }

  return <StreamAvatar track={track} />
}
