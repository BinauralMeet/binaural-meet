import {forgetGyazoToken, getGyazoToken} from './GyazoAuth'

export interface GayazoReturnType{
  url: string,
  size: [number, number],
}

//  How long to look for the uploaded image in the user's list before giving up.
const FIND_TRIES = 6
const FIND_INTERVAL_MS = 700

//  Uploads into the user's own Gyazo (connected via GyazoAuth.ts) and resolves with its URL.
//
//  upload.gyazo.com does not allow other sites to read its answer (no Access-Control-Allow-Origin;
//  checked 2026-10-02), so the URL in that answer is out of reach. The upload itself still goes
//  through -- a multipart form POST is a "simple" request -- and api.gyazo.com, which does allow
//  cross-site reads, then tells us the user's newest image: the one just uploaded. Nothing passes
//  through any server of ours. Rejects when not connected, so callers fall back to Google Drive.
export function uploadToGyazo(imageData: Blob):Promise<string> {
  const token = getGyazoToken()
  if (!token){ return Promise.reject('not connected') }
  const started = Date.now() - 5000   //  allow for some clock skew between us and Gyazo

  const formData = new FormData()
  formData.append('access_token', token)
  formData.append('imagedata', imageData)

  return fetch('https://upload.gyazo.com/api/upload', {method: 'POST', body: formData, mode: 'no-cors'})
    .then(() => findNewestSince(token, started))
}

function findNewestSince(token: string, since: number): Promise<string>{
  return new Promise<string>((resolve, reject) => {
    let tries = 0
    const look = () => {
      tries += 1
      fetch(`https://api.gyazo.com/api/images?per_page=1&access_token=${encodeURIComponent(token)}`)
      .then((res) => {
        if (res.status === 401){
          //  The user revoked BM in Gyazo: forget the token so the next paste asks again.
          forgetGyazoToken()
          throw new Error('gyazo token revoked')
        }

        return res.json()
      }).then((list) => {
        const newest = Array.isArray(list) ? list[0] : undefined
        if (newest?.url && Date.parse(newest.created_at) >= since){
          resolve(newest.url)
        }else if (tries < FIND_TRIES){
          window.setTimeout(look, FIND_INTERVAL_MS)
        }else{
          reject('uploaded image not found')
        }
      }).catch((e) => reject(`${e}`))
    }
    look()
  })
}

export function getImageSize(url: string) {
  const promise = new Promise<[number, number]>((resolutionFunc, rejectionFunc) => {
    console.log("getImageSize url = " + url)
    const img = new Image()
    img.src = url
    img.onload = () => {
      const size:[number, number] = [img.width, img.height]
      console.log("size = " + size)
      resolutionFunc(size)
    }
    img.onerror = () => { rejectionFunc([0, 0]) }
  })

  return promise
}
