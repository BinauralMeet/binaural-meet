import { ISharedContent } from '@models/ISharedContent'
import {JitsiTrack} from 'lib-jitsi-meet'
import {MapObject} from './MapObject'
import {findReverseColorRGB, findTextColorRGB, getRandomColorRGB, rgb2Color} from './utils/color'
import {Mouse} from './utils/coordinates'

export const PARTICIPANT_SIZE = 60

export interface ParticipantBase extends MapObject{
  physics: Physics
  mouse: Mouse
  id: string
  information: RemoteInformation|LocalInformation
}

export interface RemoteParticipant extends ParticipantBase {
  tracks: Tracks
  informationReceived: boolean
  closedZone?: ISharedContent
  inLocalsZone: boolean
}

export interface LocalParticipant extends ParticipantBase {
  soundLocalizationBase: SoundLocalizationBase
  information: LocalInformation
  zone?: ISharedContent
  tracks: Tracks
}
export type Participant = LocalParticipant | RemoteParticipant

export interface BaseInformation {
  name: string
  avatarSrc: string
  color: number[]
  textColor: number[]
}
export interface RemoteInformation extends BaseInformation{
}
export interface LocalInformation extends BaseInformation{
  email: string
  notifyCall: boolean
  notifyTouch: boolean
  notifyNear: boolean
  notifyYarn: boolean
}
export const defaultInformation:LocalInformation = {
  name: 'Anonymous',
  email: '',
  avatarSrc: '',
  color: [],
  textColor: [],
  notifyCall: true,
  notifyTouch: false,
  notifyNear: false,
  notifyYarn: false,
}
export const defaultRemoteInformation:RemoteInformation = {
  name: '',
  avatarSrc: '',
  color: [],
  textColor: [],
}
export interface Tracks {
  audio: JitsiTrack | undefined
  avatar: JitsiTrack | undefined
  audioStream: MediaStream | undefined
  avatarStream: MediaStream | undefined
}

export interface TrackStates{
  micMuted: boolean,
  speakerMuted: boolean,
  headphone: boolean,
}
export interface Physics {
  located: boolean
  onStage: boolean
  awayFromKeyboard: boolean
}
export const defaultPhysics: Physics = {
  located: true,
  onStage: false,
  awayFromKeyboard: false,
}

export type SoundLocalizationBase = 'avatar' | 'user'

export function getColorOfParticipant(information: BaseInformation) {
  let color = information.color
  if (!color.length) {
    if (information.name.length){
      color = getRandomColorRGB(information.name)
    }else{
      color = [0xD0, 0xD0, 0xE0]
    }
  }
  let textColor = information.textColor
  if (!textColor.length) {
    textColor = findTextColorRGB(color)
  }
  const reverseRGB = findReverseColorRGB(color)
  const colors = [rgb2Color(color), rgb2Color(textColor), rgb2Color(reverseRGB)]

  return colors
}
