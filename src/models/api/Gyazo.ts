export interface GayazoReturnType{
  url: string,
  size: [number, number],
}
export function uploadToGyazo(imageData: Blob):Promise<string> {
  const promise = new Promise<string>((resolutionFunc, rejectionFunc) => {
    const formData = new FormData()
    formData.append('access_token', 'e9889a51fca19f2712ec046016b7ec0808953103e32cd327b91f11bfddaa8533')
    formData.append('imagedata', imageData)
    fetch('https://upload.gyazo.com/api/upload', {method: 'POST', body: formData})
    .then(response => response.json().then(json => ({ok: response.ok, status: response.status, json})))
    .then(({ok, status, json}) => {
      //  A refused upload (e.g. a revoked token: 401 {"message": "You are not authorized."},
      //  2026-10-02) still answers with JSON, just without a url. Resolving with that undefined
      //  url used to make the paste silently do nothing.
      if (!ok || typeof json?.url !== 'string'){
        console.warn(`Gyazo upload refused (${status}): ${json?.message ?? ''}`)
        rejectionFunc('refused')

        return
      }
      resolutionFunc(json.url)
    })
    .catch((error) => {
      if (`${error}` === 'TypeError: Failed to fetch'){
        rejectionFunc('type')
      }else{
        console.error(error)
        rejectionFunc('')
      }
    })
  })

  return promise
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
