import JitsiMeetJS from 'lib-jitsi-meet'
import JitsiLocalTrack from 'lib-jitsi-meet/modules/RTC/JitsiLocalTrack'
//import * as TPC from 'lib-jitsi-meet/modules/RTC/TPCUtils'

export function createJitisLocalTracksFromStream(stream: MediaStream){
  const videoTrack: MediaStreamTrack = stream.getVideoTracks()[0]
  const audioTrack: MediaStreamTrack = stream.getAudioTracks()[0]
  let audioStream: MediaStream
  let audioTrackInfo: JitsiMeetJS.TrackInfo | undefined = undefined
  let videoStream: MediaStream
  let videoTrackInfo: JitsiMeetJS.TrackInfo | undefined = undefined

  if (audioTrack) {
    audioStream = new MediaStream([audioTrack])
    audioTrackInfo = {
      videoType: null,
      mediaType: 'audio',
      rtcId: 0,
      stream: audioStream,
      track: audioTrack,
      effects: undefined,
      resolution: audioTrack.getSettings().height,
      deviceId: 'videofile_chrome',
      facingMode: 'environment',
    }
  }

  if (videoTrack) {
    videoStream = new MediaStream([videoTrack])
    videoTrackInfo = {
      videoType: 'camera',
      mediaType: 'video',
      rtcId: 1,
      stream: videoStream,
      track: videoTrack,
      effects: undefined,
      resolution: videoTrack.getSettings().height,
      deviceId: 'videofile_chrome',
      facingMode: 'environment',
    }
  }


  return [videoTrackInfo ? new JitsiLocalTrack(videoTrackInfo) : undefined,
    audioTrackInfo ? new JitsiLocalTrack(audioTrackInfo) : undefined]
}
