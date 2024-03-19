import { ISharedContent } from '@models/ISharedContent'
import {MapObject} from './MapObject'
import {findReverseColorRGB, findTextColorRGB, getRandomColorRGB, rgb2Color} from './utils/color'
import {Mouse} from './utils/coordinates'
import * as Kalidokit from 'kalidokit'

export const PARTICIPANT_SIZE = 60

export interface VRMRigs{
  face?:Kalidokit.TFace,
  pose?:Kalidokit.TPose,
  leftHand?: Kalidokit.THand<'Left'>
  rightHand?: Kalidokit.THand<'Right'>
}

export interface ParticipantBase extends MapObject{
  physics: Physics
  mouse: Mouse
  viewpoint: Viewpoint
  id: string
  information: RemoteInformation|LocalInformation
  zIndex: number
  vrmRigs?: VRMRigs
}

export interface PlaybackParticipant extends ParticipantBase {
  audioBlob?: Blob
  videoBlob?: Blob
}

export interface PlaybackContent extends ISharedContent {
  audioBlob?: Blob
  videoBlob?: Blob
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

export type AvatarType = 'frog' | 'arrow' | 'circle' | ''

export interface BaseInformation {
  name: string
  avatar: AvatarType
  avatarSrc: string
  color: number[]
  textColor: number[]
}
export interface RemoteInformation extends BaseInformation{
}
export interface LocalInformation extends BaseInformation{
  email: string
  role: string
  token: string
  faceTrack: boolean
  notifyCall: boolean
  notifyTouch: boolean
  notifyNear: boolean
  notifyYarn: boolean
}
export const defaultInformation:LocalInformation = {
  name: '',
  email: '',
  role: 'guest',
  token: '',
  avatar: 'frog',
  avatarSrc: '',
  color: [],
  textColor: [],
  faceTrack: false,
  notifyCall: true,
  notifyTouch: false,
  notifyNear: false,
  notifyYarn: false,
}
export const defaultRemoteInformation:RemoteInformation = {
  name: '',
  avatar: 'frog',
  avatarSrc: '',
  color: [],
  textColor: [],
}
export interface Tracks {
  audio: MediaStreamTrack | undefined
  avatar: MediaStreamTrack | undefined
  audioStream: MediaStream | undefined
  avatarStream: MediaStream | undefined
}

export interface TrackStates{
  micMuted: boolean,
  speakerMuted: boolean,
  headphone: boolean,
}
export interface Physics {
  located: boolean            //  located on map or not
  onStage: boolean            //  bloardcast or not
  awayFromKeyboard: boolean
}
export const defaultPhysics: Physics = {
  located: true,
  onStage: false,
  awayFromKeyboard: false,
}
export interface Viewpoint{
  height: number              //  zoom (viewing range) of the map
  center: [number, number]    //  center of the map from the avatar
  nodding?: number            //  up-down nose direction
}
export const defaultViewpoint: Viewpoint = {
  height: 0,
  center: [0,0],
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
