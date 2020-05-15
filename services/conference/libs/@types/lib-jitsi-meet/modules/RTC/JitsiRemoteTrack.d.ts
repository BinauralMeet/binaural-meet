import JitsiTrack, {MediaType} from './JitsiTrack'
import {JitsiConference} from '../../JitsiConference'
import {VideoType} from '../../service/RTC/VideoType'

declare class JitsiRemoteTrack extends JitsiTrack {
  constructor(
    rtc: any,
    conference: JitsiConference,
    ownerEndpointId: string,
    stream: MediaStream,
    track: MediaStreamTrack,
    mediaType: typeof MediaType,
    videoType: typeof VideoType,
    ssrc: number,
    muted: boolean,
    isP2P: boolean,
    )

    setMute: (value: boolean) => void
    isMuted: () => boolean
    getParticipantId: () => string
    isLocal: () => false
    getSSRC: () => number
    toString: () => string
}
export default JitsiRemoteTrack