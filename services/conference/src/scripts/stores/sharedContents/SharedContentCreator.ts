import {uploadToGyazo} from '@models/api/Gyazo'
import {Perceptibility,  Pose2DMap} from '@models/MapObject'
import {defaultPerceptibility} from '@models/MapObject'
import {ContentType, SharedContent as ISharedContent} from '@models/SharedContent'
import {defaultValue as mapObjectDefaultValue} from '@stores/MapObject'
import {MapData} from '@stores/MapObject/MapData'
import {JitsiLocalTrack} from 'lib-jitsi-meet'
import _ from 'lodash'
import participants from '../participants/Participants'
import sharedContents, {contentLog} from './SharedContents'

export const defaultContent: ISharedContent = Object.assign({}, mapObjectDefaultValue, {
  name: '',
  type: '' as ContentType,
  url: '',
  size: [0, 0] as [number, number],
  originalSize: [0, 0] as [number, number],
  id: '',
  zorder: 0,
  pinned: false,
  isEditable() {
    return this.type === 'text' || this.type === 'iframe' || this.type === 'gdrive'
  },
})

///  Add perceptibility and function to object obtained by JSON.parse()
export function jsonToContents(json: string, perceptibility = defaultPerceptibility) {
  const cs = JSON.parse(json)
  for (const c of cs) {
    c.perceptibility = Object.assign({}, defaultPerceptibility)
    c.isEditable = defaultContent.isEditable
  }

  return cs as ISharedContent[]
}


class SharedContent implements ISharedContent {
  name!: string
  type!: ContentType
  url!: string
  id!: string
  zorder!: number
  pinned!: boolean
  pose!: Pose2DMap
  size!: [number, number]
  originalSize!:[number, number]
  perceptibility!: Perceptibility
  isEditable: () => boolean
  constructor() {
    Object.assign(this, _.cloneDeep(defaultContent))
    this.isEditable = defaultContent.isEditable
  }
}

export function createContent() {
  return new SharedContent()
}

export function createContentOfIframe(urlStr: string, map: MapData) {
  const pasted = new SharedContent()
  const url = new URL(urlStr)
  if (url.hostname === 'youtu.be' || url.hostname === 'youtube.com' || url.hostname === 'www.youtube.com') {
    const paramStrs = url.search.slice(1).split('&')
    const params = new Map<string, string>(paramStrs.map(str => str.split('=') as [string, string]))
    if (url.hostname === 'youtu.be') {
      params.set('v', url.pathname.slice(1))
    }
    pasted.url = ''
    for (const param of params) {
      if (pasted.url === '') {
        pasted.url = `${param[0]}=${param[1]}`
      }else {
        pasted.url = `${pasted.url}&${param[0]}=${param[1]}`
      }
    }
    pasted.type = 'youtube'
    pasted.pose.position[0] = map.mouseOnMap[0]
    pasted.pose.position[1] = map.mouseOnMap[1]
    const YT_WIDTH = 640
    const YT_HEIGHT = 380
    pasted.size[0] = YT_WIDTH
    pasted.size[1] = YT_HEIGHT
  }else if (url.hostname === 'drive.google.com' || url.hostname === 'docs.google.com') {  //  google drive
    pasted.type = 'gdrive'
    const fileIdStart = url.pathname.slice(url.pathname.indexOf('/d/') + 3)
    const fileId = fileIdStart.slice(0, fileIdStart.indexOf('/'))
    pasted.url = `id=${fileId}`
    pasted.pose.position[0] = map.mouseOnMap[0]
    pasted.pose.position[1] = map.mouseOnMap[1]
    const IFRAME_WIDTH = 600
    const IFRAME_HEIGHT = 800
    pasted.size[0] = IFRAME_WIDTH
    pasted.size[1] = IFRAME_HEIGHT
  }else {  //  generic iframe
    pasted.type = 'iframe'
    pasted.url = urlStr
    pasted.pose.position[0] = map.mouseOnMap[0]
    pasted.pose.position[1] = map.mouseOnMap[1]
    const IFRAME_WIDTH = 600
    const IFRAME_HEIGHT = 800
    pasted.size[0] = IFRAME_WIDTH
    pasted.size[1] = IFRAME_HEIGHT
  }
  contentLog(`${pasted.type} created url = ${pasted.url}`)

  return pasted
}
export function createContentOfText(text: string, map: MapData) {
  const pasted = new SharedContent()
  pasted.type = 'text'
  const textPhrase = {
    text,
    pid: participants.localId,
    name: participants.local.get().information.name,
  }
  pasted.url = JSON.stringify([textPhrase])
  pasted.pose.position[0] = map.mouseOnMap[0]
  pasted.pose.position[1] = map.mouseOnMap[1]
  const slen = Math.sqrt(text.length)
  const STRING_SCALE_W = 20
  const STRING_SCALE_H = 15
  pasted.size[0] = slen * STRING_SCALE_W
  pasted.size[1] = slen * STRING_SCALE_H

  return pasted
}
export function createContentOfImage(imageFile: File, map: MapData, offset?:[number, number]): Promise<SharedContent> {
  const IMAGESIZE_LIMIT = 500
  const promise = new Promise<SharedContent>((resolutionFunc, rejectionFunc) => {
    uploadToGyazo(imageFile).then(({url, size}) => {
      // console.log("mousePos:" + (global as any).mousePositionOnMap)
      const pasted = new SharedContent()
      pasted.type = 'img'
      pasted.url = url
      const max = size[0] > size[1] ? size[0] : size [1]
      const scale = max > IMAGESIZE_LIMIT ? IMAGESIZE_LIMIT / max : 1
      pasted.size = [size[0] * scale, size[1] * scale]
      pasted.originalSize = [size[0], size[1]]
      const CENTER = 0.5
      for (let i = 0; i < pasted.pose.position.length; i += 1) {
        if (offset) {
          pasted.pose.position[i] = map.mouseOnMap[i] + offset[i]
        }else {
          pasted.pose.position[i] = map.mouseOnMap[i] - CENTER * pasted.size[i]
        }
      }
      resolutionFunc(pasted)
    })
  })

  return promise
}

declare const gapi:any    //  google api from index.html
let GoogleAuth:any        // Google Auth object.
let isAuthorized = false
function updateSigninStatus(isSignedIn:boolean) {
  if (isSignedIn) {
    isAuthorized = true
  } else {
    isAuthorized = false
  }
}

export function createContentOfPdf(file: File, map: MapData, offset?:[number, number]): Promise<SharedContent> {
  const promise = new Promise<SharedContent>((resolutionFunc, rejectionFunc) => {
    if (gapi) {
      const API_KEY = 'AIzaSyCE4B2cKycH0fVmBznwfr1ynnNf2qNEU9M'
      const CLIENT_ID = '188672642721-3f8u1671ecugbl2ukhjmb18nv283upm0.apps.googleusercontent.com'
      gapi.client.init(
        {
          apiKey: API_KEY,
          clientId: CLIENT_ID,
          scope: 'https://www.googleapis.com/auth/drive.appdata',
          discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
        },
      ).then(
        () => {
          console.log('Before getAuthInstance')
          GoogleAuth = gapi.auth2.getAuthInstance()
          // Listen for sign-in state changes.
          console.log('Before listen updateSigninStatus')
          GoogleAuth.isSignedIn.listen(updateSigninStatus)
        },
        (reason:any) => {
          console.log('gapi.client.init failed:', reason)
        },
      )
    }
  })

  return promise
}


export function createContentOfVideo(tracks: JitsiLocalTrack[], map: MapData) {
  const pasted = new SharedContent()
  pasted.type = 'screen'
  pasted.url = ''
  pasted.pose.position[0] = map.mouseOnMap[0]
  pasted.pose.position[1] = map.mouseOnMap[1]
  const track = tracks.find(track => track.getType() === 'video')
  const settings = track?.getTrack().getSettings()
  if (settings) {
    pasted.originalSize = [settings.width || 0, settings.height || 0]
  }else {
    pasted.originalSize = [0, 0]
  }
  pasted.size = [(pasted.originalSize[0] || 640) / 2, (pasted.originalSize[1] || 360) / 2]

  return pasted
}

export function disposeContent(c: ISharedContent) {
  if (c.type === 'screen') {
    const pid = sharedContents.owner.get(c.id)
    if (pid === participants.localId) {
      sharedContents.tracks.clearLocalContent(c.id)
    }else {
      sharedContents.tracks.clearRemoteContent(c.id)
    }
  }
}
