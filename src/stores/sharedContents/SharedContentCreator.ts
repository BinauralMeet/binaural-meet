import {getProxiedUrl} from '@models/api/CORS'
import GoogleDrive from '@models/api/GoogleDrive'
import {getImageSize, uploadToGyazo} from '@models/api/Gyazo'
import {ContentType, isContentWallpaper, ISharedContent, SharedContentData,
  SharedContentId, TEN_YEAR, TextMessages, TIME_RESOLUTION_IN_MS} from '@models/ISharedContent'
import {Pose2DMap} from '@models/utils'
import {extract} from '@models/utils'
import { getMimeType } from '@models/utils'
import {isSelfUrl} from '@models/utils'
import {MapData} from '@stores/Map'
import {defaultValue as mapObjectDefaultValue} from '@stores/MapObject'
import {JitsiLocalTrack} from 'lib-jitsi-meet'
import _ from 'lodash'
import participants from '../participants/Participants'
import sharedContents, {contentLog} from './SharedContents'

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
})

export function makeThemContents(them: ISharedContent[]) {
  return them
}

class SharedContentImp implements ISharedContent {
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
  noFrame?: boolean
  opacity?: number
  constructor() {
    Object.assign(this, _.cloneDeep(defaultContent))
  }
}

export function createContent() {
  const content = new SharedContentImp()
  content.ownerName = participants.local.information.name
  content.color = participants.local.information.color
  content.textColor = participants.local.information.textColor
  content.zorder = Date.now()

  return content
}

function makeItPdf(pasted:ISharedContent, urlStr: string, map:MapData){
  pasted.type = 'pdf'
  pasted.url = urlStr
  pasted.pose.position[0] = map.mouseOnMap[0]
  pasted.pose.position[1] = map.mouseOnMap[1]
  pasted.size[0] = 500
  pasted.size[1] = pasted.size[0] * 1.41421356
}

export function createContentOfIframe(urlStr: string, map: MapData) {
  return new Promise<ISharedContent>((resolve, reject) => {
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
      pasted.size[0] = 640
      pasted.size[1] = 380
    }else if (url.hostname === 'drive.google.com' || url.hostname === 'docs.google.com') {  //  google drive
      pasted.type = 'gdrive'
      const fileIdStart = url.pathname.slice(url.pathname.indexOf('/d/') + 3)
      const fileId = fileIdStart.slice(0, fileIdStart.indexOf('/'))
      pasted.url = `id=${fileId}`
      pasted.pose.position[0] = map.mouseOnMap[0]
      pasted.pose.position[1] = map.mouseOnMap[1]
      pasted.size[0] = 900
      pasted.size[1] = 700
    }else if (url.hostname === 'wbo.ophir.dev'){  //  whiteboard
      pasted.type = 'whiteboard'
      pasted.url = urlStr
      pasted.pose.position[0] = map.mouseOnMap[0]
      pasted.pose.position[1] = map.mouseOnMap[1]
      pasted.size[0] = 700
      pasted.size[1] = 740
    }else if (url.pathname.substring(url.pathname.length-4) === '.pdf' ||
      url.pathname.substring(url.pathname.length-4) === '.PDF' ){  //  pdf
      makeItPdf(pasted, urlStr, map)
    }else {  //  generic iframe
      //  get mime type first
      getMimeType(getProxiedUrl(urlStr)).then((type)=>{
        if (type==='application/pdf'){
          makeItPdf(pasted, urlStr, map)
          resolve(pasted)
        }
      }).finally(()=>{
        if (!pasted.type){
          pasted.type = 'iframe'
          pasted.url = urlStr
          pasted.pose.position[0] = map.mouseOnMap[0]
          pasted.pose.position[1] = map.mouseOnMap[1]
          pasted.size[0] = 600
          pasted.size[1] = 800
          resolve(pasted)
        }
      })
    }
    if (pasted.type){
      resolve(pasted)
      contentLog(`${pasted.type} created url = ${pasted.url}`)
    }
})
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
export function createContentOfImage(imageFile: File, map: MapData,  offset?:[number, number])
  : Promise<SharedContentImp> {
  const promise = new Promise<SharedContentImp>((resolutionFunc, rejectionFunc) => {
    if (participants.local.uploaderPreference === 'gyazo'){
      uploadToGyazo(imageFile).then((url) => {
        createContentOfImageUrl(url, map, offset).then(resolutionFunc)
      }).catch((error) => {
        if (error === 'type'){
          GoogleDrive.uploadFileToGoogleDrive(imageFile).then((url) => {
            createContentOfImageUrl(url, map, offset).then(resolutionFunc)
          }).catch(rejectionFunc)
        }else{
          rejectionFunc(error)
        }
      })
    }else{
      GoogleDrive.uploadFileToGoogleDrive(imageFile).then((url) => {
        createContentOfImageUrl(url, map, offset).then(resolutionFunc).catch(rejectionFunc)
      })
    }
  })

  return promise
}

export function createContentOfImageUrl(url: string, map: MapData,
  offset?:[number, number]): Promise<SharedContentImp> {
  const IMAGESIZE_LIMIT = 500
  const promise = new Promise<SharedContentImp>((resolutionFunc, rejectionFunc) => {
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

export function createContentOfPdf(file: File, map: MapData, offset?:[number, number]): Promise<SharedContentImp> {
  console.error('createContentOfPdf called.')
  const promise = new Promise<SharedContentImp>((resolutionFunc, rejectionFunc) => {
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

export function createContentFromText(str: string, map:MapData){
  return new Promise<ISharedContent>((resolve, reject)=>{
    let content = undefined
    if (str.indexOf('http://') === 0 || str.indexOf('https://') === 0) {
      const url = new URL(str)
      const ext = str.slice(-4)
      if (isSelfUrl(url)) {
        //  Openning of self url makes infinite loop. So, create text instead.
        content = createContentOfText(str, map)
        content.name = '! recursive reference'
        resolve(content)
      }else if (ext === '.jpg' || ext === '.JPG' || ext === 'jpeg' || ext === 'JPEG' ||
        ext === '.png' || ext === '.PNG' || ext === '.gif' || ext === '.GIF' ||
        ext === '.svg' || ext === '.SVG') {
        createContentOfImageUrl(str, map).then((content) => {
          content.name = url.pathname
          resolve(content)
        }).catch(reject)
      }else {
        createContentOfIframe(str, map).then((content) => {
          if (content.type === 'iframe') {
            //  iframe is not work well because of CORS problem.
            content = createContentOfText(str, map)
            content.name = `${url.host}${url.pathname}${url.search}`
          }
          if (content.type === 'youtube') {
            content.name = `${url.search.substring(1)}`
          }else {
            content.name = `${url.host}${url.pathname}${url.search}`
          }
          resolve(content)
        }).catch(reject)
      }
    }else {
      content = createContentOfText(str, map)
      content.name = str.substring(0, 20)
      resolve(content)
    }
  })
}
//  set pasted or dragged content to pasted content (not shared) or create shared content directly
export function createContentsFromDataTransfer(dataTransfer: DataTransfer, map: MapData) {
  return new Promise<ISharedContent[]>((resolve, reject)=>{
    if (dataTransfer?.types.includes('Files')) {   //  If file is pasted)
      const items = Array.from(dataTransfer.items)
      const contents:ISharedContent[] = []
      const reasons:any[] = []
      for(const item of items){
        const file = item.getAsFile()
        if (item.kind === 'file' && file) {
          let creator: ((file:File, map:MapData, offset?:[number, number]) => Promise<ISharedContent>)
            | undefined = undefined
          if (item.type.indexOf('image') !== -1) {
            creator = createContentOfImage
          }else if (item.type === 'application/pdf') {
            creator = createContentOfPdf
          }
          if (creator) {
            creator(file, map).then((content) => {
              content.name = file.name
              contents.push(content)
              if (contents.length + reasons.length === items.length){
                contents.length ? resolve(contents) : reject(reasons)
              }
            }).catch((reason) => {
              reasons.push(reason)
              if (contents.length + reasons.length  === items.length){
                contents.length ? resolve(contents) : reject(reasons)
              }
            })
          }
        }else{
          reasons.push('Creator not found.')
        }
      }
    }else if (dataTransfer?.types.includes('text/plain')) {
      dataTransfer.items[0].getAsString((str:string) => {
        createContentFromText(str, map).then(c => resolve([c])).catch(reject)
      })
    }else {
      console.error('Unhandled content types:', dataTransfer?.types)
      reject(`Unhandled content types:${dataTransfer?.types}`)
    }
  })
}

const extractData = extract<SharedContentData>({
  zorder: true, name: true, ownerName: true, color: true, textColor:true,
  type: true, url: true, pose: true, size: true, originalSize: true, pinned: true,
  noFrame: true, opacity: true, zone:true, playback:true
})
export function extractContentData(c:ISharedContent) {
  return extractData(c)
}
export function extractContentDatas(cs:ISharedContent[]) {
  return cs.map(extractContentData)
}
const extractDataAndId = extract<SharedContentData&SharedContentId>({
  zorder: true, name: true, ownerName: true, color: true, textColor:true,
  type: true, url: true, pose: true, size: true, originalSize: true,
  pinned: true, noFrame: true, opacity:true, zone:true, id: true, playback: true
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
    mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    || mimeType === 'application/vnd.google-apps.presentation'
    || mimeType === 'application/vnd.google-apps.spreadsheet'
    || mimeType.slice(0, 5) === 'image'
    || mimeType.slice(0, 5) === 'video'
    || mimeType.slice(0, 5) === 'audio'
  )
}
export function isGDrivePreviewEditUrl(mimeType?: string){
  if (!mimeType){ return false }

  return mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  || mimeType === 'application/vnd.google-apps.spreadsheet'
  || mimeType === 'application/vnd.google-apps.document'
  || mimeType === 'application/vnd.google-apps.presentation'
}

export function getGDriveUrl(editing: boolean, params: Map<string, string>){
  const fileId = params.get('id')
  let mimeType = params.get('mimeType')
  mimeType = mimeType ? mimeType : ''
  const comp = 'application/vnd.google-apps.'

  let url = `https://drive.google.com/file/d/${fileId}/preview`
  if (editing || isGDrivePreviewEditUrl(mimeType)){
    if (mimeType.substr(0, comp.length) === comp){
      let app = mimeType.substr(comp.length)
      if (app !== 'failed'){
        if (app === 'spreadsheet'){ app = 'spreadsheets' }
        url = `https://docs.google.com/${app}/d/${fileId}/edit`
      }
    } else if (mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
      const app = 'spreadsheets'
      url = `https://docs.google.com/${app}/d/${fileId}/edit`
    }
  }

  return url
}
export function getBeforeParamsOfUrl(url: string){
  const start = url.indexOf('?')

  return start < 0 ? url : url.substring(0, start)
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

//  change zorder to the top.
export function moveContentToTop(c: SharedContentImp) {
  if (isContentWallpaper(c)){
    let top = sharedContents.sorted.findIndex(c => c.zorder > TEN_YEAR)
    if (top < 0){ top = sharedContents.sorted.length }
    top -= 1
    if (top >= 0){
      const order = sharedContents.sorted[top].zorder + 1
      c.zorder = order <= TEN_YEAR ? order : TEN_YEAR
    }
  }else{
    c.zorder = Math.floor(Date.now() / TIME_RESOLUTION_IN_MS)
  }
}
//  change zorder to the bottom.
export function moveContentToBottom(c: SharedContentImp) {
  if (isContentWallpaper(c)){
    const bottom = sharedContents.sorted[0]
    if (bottom !== c) {
      c.zorder = bottom.zorder - 1
    }
  }else{
    const bottom = sharedContents.sorted.find(c => c.zorder > TEN_YEAR)
    if (!bottom) {
      moveContentToTop(c)
    }else{
      c.zorder = bottom.zorder - 1
    }
  }
}
//  change zorder to far below the bottom.
export function makeContentWallpaper(c: SharedContentImp, flag: boolean) {
  //if (isContentWallpaper(c)) { return }
  if (flag){
    let zorder = TEN_YEAR - (Math.floor(Date.now() / TIME_RESOLUTION_IN_MS) - c.zorder)
    if (zorder < 0){
      zorder = c.zorder % TEN_YEAR
    }
    c.zorder = zorder
  }else{
    c.zorder = c.zorder + TEN_YEAR
  }
}
