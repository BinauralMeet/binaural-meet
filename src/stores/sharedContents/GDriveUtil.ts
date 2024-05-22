import roomInfo from '@stores/RoomInfo'


export function getInformationOfGDriveContent(fileId: string){
  //  console.log('gapi try to get mimeType')
  const API_KEY = 'AIzaSyCE4B2cKycH0fVmBznwfr1ynnNf2qNEU9M'
  const rv = new Promise<{name:string, mimeType:string}>((resolve, reject)=>{
    if (gapi){
      if (roomInfo.gDriveToken){
        gapi.client.setToken({access_token: roomInfo.gDriveToken})
      }else{
        gapi.client.setApiKey(API_KEY)
      }
      gapi.client.load('drive', 'v3', () => {
        gapi.client.drive.files.get({
          fileId,
          fields:'mimeType,name',
          supportsAllDrives: true,
        })
        .then((result:any) => {
          const body = JSON.parse(result.body)
          //console.log(`gapi get: ${JSON.stringify(result)}`)
          //console.log(`gapi mimeType:${body.mimeType}  name:${body.name}`)
          resolve({mimeType:body.mimeType, name: body.name})
        }).catch((reason:any) => {
          //console.log('gapi error', reason)
          reject(reason)
        })
      })
    }else{
      reject('gapi is not loaded')
    }
  })

  return rv
}

export function getSlides(params:Map<string, string>){
  const slidesStr = params.get('slides')
  return slidesStr ? JSON.parse(slidesStr) : []
}
export function getPage(params:Map<string, string>){
  const pageStr = params.get('page')
  return pageStr ? Number(pageStr) : 1
}


export const MIMETYPE_GOOGLE_APP = 'application/vnd.google-apps.'
export const MIMETYPE_GOOGLE_APP_PRESENTATION = `${MIMETYPE_GOOGLE_APP}presentation`

export function getGDriveUrl(editing: boolean, params:Map<string, string>){
  const fileId = params.get('id')
  let mimeType = params.get('mimeType')
  mimeType = mimeType ? mimeType : ''
  let url = `https://drive.google.com/file/d/${fileId}/preview`
  if (editing || isGDrivePreviewEditUrl(mimeType)){
    if (mimeType.substring(0, MIMETYPE_GOOGLE_APP.length) === MIMETYPE_GOOGLE_APP){
      let app = mimeType.substring(MIMETYPE_GOOGLE_APP.length)
      if (app !== 'failed'){
        if (app === 'spreadsheet'){ app = 'spreadsheets' }
        url = `https://docs.google.com/${app}/d/${fileId}/edit`
      }
    } else if (mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
      const app = 'spreadsheets'
      url = `https://docs.google.com/${app}/d/${fileId}/edit`
      console.log('edit url in share content creator:', url)
    }
  }else if(mimeType===MIMETYPE_GOOGLE_APP_PRESENTATION){
    let slide='p'
    const slides = getSlides(params)
    if (slides.length){
      const page = getPage(params)
      slide = slides[page-1]
    }
    url = `https://docs.google.com/presentation/d/${fileId}/preview?rm=minimal&slide=id.${slide}`
  }

  return url
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
}
