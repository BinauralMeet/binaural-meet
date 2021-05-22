import {getImageSize, uploadToGyazo} from '@models/api/Gyazo'
import {defaultPerceptibility,  Perceptibility, Pose2DMap} from '@models/MapObject'
import {ContentType, SharedContent as ISharedContent,
  SharedContentData as ISharedContentData, SharedContentId as ISharedContentId, TextMessages} from '@models/SharedContent'
import {extract} from '@models/utils'
import {MapData} from '@stores/Map'
import {defaultValue as mapObjectDefaultValue} from '@stores/MapObject'
import {JitsiLocalTrack} from 'lib-jitsi-meet'
import _ from 'lodash'
import participants from '../participants/Participants'
import sharedContents, {contentLog} from './SharedContents'

const TIME_RESOLUTION_IN_MS = 100
export const TEN_YEAR = 1000 * 60 * 60 * 24 * 365 * 10 / TIME_RESOLUTION_IN_MS
export const defaultContent: ISharedContent = Object.assign({}, mapObjectDefaultValue, {
  name: '',
  ownerName: '',
  color: [],
  textColor: [],
  type: '' as ContentType,
  url: '',
  size: [0, 0] as [number, number],
  originalSize: [0, 0] as [number, number],
  id: '',
  zorder: 0,
  pinned: false,
  isEditable() {
    return this.type === 'text' || this.type === 'iframe' ||
      this.type === 'whiteboard' || this.type === 'gdrive'
  },
  isBackground() {
    return this.zorder < TEN_YEAR
  },
  moveToTop() {
    this.zorder = Math.floor(Date.now() / TIME_RESOLUTION_IN_MS)
  },
  moveToBottom() {
    const bottom = sharedContents.all.find(c => c.zorder > TEN_YEAR)
    if (!bottom) {
      this.moveToTop()

      return
    }
    this.zorder = bottom.zorder - 1
  },
  moveToBackground() {
    if (this.isBackground()) { return }
    this.zorder = TEN_YEAR - (Math.floor(Date.now() / TIME_RESOLUTION_IN_MS) - this.zorder)
  },
})

function addContentFunctions(c: ISharedContent) {
  c.isEditable = defaultContent.isEditable
  c.isBackground = defaultContent.isBackground
  c.moveToTop = defaultContent.moveToTop
  c.moveToBottom = defaultContent.moveToBottom
  c.moveToBottom = defaultContent.moveToBottom
}
///  Add perceptibility and function to object obtained by JSON.parse()
export function jsonToContents(json: string, perceptibility = defaultPerceptibility) {
  const cs = JSON.parse(json)
  for (const c of cs) {
    c.perceptibility = Object.assign({}, defaultPerceptibility)
    addContentFunctions(c)
  }

  return cs as ISharedContent[]
}

export function makeItContent(it: ISharedContentData) {
  const sc = it as ISharedContent
  sc.perceptibility = Object.assign({}, defaultPerceptibility)
  addContentFunctions(sc)

  return sc
}
export function makeThemContents(them: ISharedContent[]) {
  for (const c of them) {
    makeItContent(c)
  }

  return them
}

export class SharedContent implements ISharedContent {
  name!: string
  ownerName!: string
  color!: number[]
  textColor!: number[]
  type!: ContentType
  url!: string
  id!: string
  zorder!: number
  pinned!: boolean
  pose!: Pose2DMap
  size!: [number, number]
  originalSize!:[number, number]
  perceptibility!: Perceptibility
  isEditable!: () => boolean
  isBackground!: () => boolean
  moveToTop!: () => void
  moveToBottom!: () => void
  moveToBackground!: () => void
  constructor() {
    Object.assign(this, _.cloneDeep(defaultContent))
    addContentFunctions(this)
  }
}

export function createContent() {
  const content = new SharedContent()
  content.ownerName = participants.local.information.name
  content.color = participants.local.information.color
  content.textColor = participants.local.information.textColor

  return content
}

export function createContentOfIframe(urlStr: string, map: MapData) {
  const pasted = createContent()
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
  }else if (url.hostname === 'wbo.ophir.dev'){  //  whiteboard
    pasted.type = 'whiteboard'
    pasted.url = urlStr
    pasted.pose.position[0] = map.mouseOnMap[0]
    pasted.pose.position[1] = map.mouseOnMap[1]
    const IFRAME_WIDTH = 600
    const IFRAME_HEIGHT = 700
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
export function createContentOfText(message: string, map: MapData) {
  const pasted = createContent()
  pasted.type = 'text'
  const textMessage = {
    message,
    pid: participants.localId,
    name: participants.local.information.name,
    color: participants.local.information.color,
    textColor: participants.local.information.textColor,
    time: Date.now(),
  }
  const texts: TextMessages = {messages:[textMessage], scroll:[0, 0]}
  pasted.url = JSON.stringify(texts)
  pasted.pose.position[0] = map.mouseOnMap[0]
  pasted.pose.position[1] = map.mouseOnMap[1]
  const slen = Math.ceil(Math.sqrt(message.length))
  const STRING_SCALE_W = 20
  const STRING_SCALE_H = 25
  pasted.size[0] = Math.max(slen * STRING_SCALE_W, 200)
  pasted.size[1] = Math.max(slen * STRING_SCALE_H, slen ? STRING_SCALE_H : STRING_SCALE_H * 3)

  return pasted
}
export function createContentOfImage(imageFile: Blob, map: MapData, offset?:[number, number]): Promise<SharedContent> {
  const promise = new Promise<SharedContent>((resolutionFunc, rejectionFunc) => {
    uploadToGyazo(imageFile).then((url) => {
      createContentOfImageUrl(url, map, offset).then(resolutionFunc)
    }).catch(rejectionFunc)
  })

  return promise
}

export function createContentOfImageUrl(url: string, map: MapData, offset?:[number, number]): Promise<SharedContent> {
  const IMAGESIZE_LIMIT = 500
  const promise = new Promise<SharedContent>((resolutionFunc, rejectionFunc) => {
    getImageSize(url).then((size) => {
      // console.log("mousePos:" + (global as any).mousePositionOnMap)
      const pasted = createContent()
      pasted.type = 'img'
      pasted.url = url
      const max = size[0] > size[1] ? size[0] : size[1]
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
//  let isAuthorized = false
function updateSigninStatus(isSignedIn:boolean) {
  if (isSignedIn) {
    //  isAuthorized = true
  } else {
    //isAuthorized = false
  }
}

export function createContentOfPdf(file: File, map: MapData, offset?:[number, number]): Promise<SharedContent> {
  console.error('createContentOfPdf called.')
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


export function createContentOfVideo(tracks: JitsiLocalTrack[], map: MapData, type:ContentType) {
  const pasted = createContent()
  pasted.type = type
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
  if (c.type === 'screen' || c.type === 'camera') {
    const pid = sharedContents.owner.get(c.id)
    if (pid === participants.localId) {
      sharedContents.tracks.clearLocalContent(c.id)
    }else {
      sharedContents.tracks.clearRemoteContent(c.id)
    }
  }
}

const extractData = extract<ISharedContentData>({
  zorder: true, name: true, ownerName: true, color: true, textColor:true,
  type: true, url: true, pose: true, size: true, originalSize: true, pinned: true,
})
export function extractContentData(c:ISharedContent) {
  return extractData(c)
}
export function extractContentDatas(cs:ISharedContent[]) {
  return cs.map(extractContentData)
}
const extractDataAndId = extract<ISharedContentData&ISharedContentId>({
  zorder: true, name: true, ownerName: true, color: true, textColor:true,
  type: true, url: true, pose: true, size: true, originalSize: true,
  pinned: true, id: true,
})
export function extractContentDataAndId(c: ISharedContent) {
  return extractDataAndId(c)
}
export function extractContentDataAndIds(cs: ISharedContent[]) {
  return cs.map(extractDataAndId)
}


function execCopy(str: string){
  const temp = document.createElement('textarea')
  temp.value = str
  temp.selectionStart = 0
  temp.selectionEnd = temp.value.length
  const s = temp.style
  s.position = 'fixed'
  s.left = '-100%'

  document.body.appendChild(temp)
  temp.focus()
  const result = document.execCommand('copy')
  temp.blur()
  document.body.removeChild(temp)

  return result
}

export function copyContentToClipboard(c: ISharedContent){
  if (c.type === 'text'){
    const tms = JSON.parse(c.url) as TextMessages
    const text = tms.messages.length ?
      tms.messages.map(m => m.message).reduce((prev, cur) => prev ? (prev + '\n') : '' + cur) : ''
    execCopy(text)
  }else if (c.type === 'youtube'){
    const array = c.url.split('&')
    const paramUrl = array.filter(s => {
      const key = s.split('=')[0]

      return key === 'v' || key === 'list' }
    )
    const param = paramUrl.length ? paramUrl.reduce((pre, cur) => (pre ? pre + '&' : '') + cur) : ''
    execCopy(`https://www.youtube.com/watch?${param}`)
  }else if (c.type === 'gdrive'){
    const params = getParamsFromUrl(c.url)
    const url = getGDriveUrl(true, params)
    execCopy(url)
  }else{
    execCopy(c.url)
  }
}

export function isGDrivePreviewScrollable(mimeType?: string) {
  if (!mimeType){ return true }

  return !(
    mimeType === 'application/vnd.google-apps.presentation'
    || mimeType === 'application/vnd.google-apps.spreadsheet'
    || mimeType.slice(0, 5) === 'image'
    || mimeType.slice(0, 5) === 'video'
    || mimeType.slice(0, 5) === 'audio'
  )
}
export function getGDriveUrl(editing: boolean, params: Map<string, string>){
  const fileId = params.get('id')
  let mimeType = params.get('mimeType')
  mimeType = mimeType ? mimeType : ''
  const comp = 'application/vnd.google-apps.'

  let url = `https://drive.google.com/file/d/${fileId}/preview`
  if (editing && mimeType.substr(0, comp.length) === comp){
    let app = mimeType.substr(comp.length)
    if (app !== 'failed'){
      if (app === 'spreadsheet'){ app = 'spreadsheets' }
      url = `https://docs.google.com/${app}/d/${fileId}/edit`
    }
  }

  return url
}
export function getParamsFromUrl(url: string){
  const start = url.indexOf('?')
  const paramStr = start >= 0 ? url.substr(start) : url
  const params = new Map(paramStr.split('&').map(str => str.split('=') as [string, string]))

  return params
}
export function getStringFromParams(params: Map<string, string>){
  let url = ''
  params.forEach((val, key) => {
    url = `${url}${url ? '&' : ''}${key}=${val}`
  })

  return url
}
export function getInformationOfGDriveContent(fileId: string){
  //  console.log('GAPI try to get mimeType')
  const API_KEY = 'AIzaSyCE4B2cKycH0fVmBznwfr1ynnNf2qNEU9M'
  const rv = new Promise<{name:string, mimeType:string}>((resolve, reject)=>{
    if (gapi){
      gapi.client.setApiKey(API_KEY)
      gapi.client.load('drive', 'v3', () => {
        gapi.client.drive.files.get({
          fileId,
          fields:'mimeType,name',
        })
        .then((result:any) => {
          const body = JSON.parse(result.body)
          //  console.log(`GAPI mimeType:${body.mimeType}  name:${body.name}`)
          resolve({mimeType:body.mimeType, name: body.name})
        }).catch((reason:any) => {
          console.debug('GAPI error', reason)
          reject(reason)
        })
      })
    }else{
      reject('gapi is not loaded')
    }
  })

  return rv
}