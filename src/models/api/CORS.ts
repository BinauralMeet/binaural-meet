// config.js
declare const config:any             //  from ../../config.js included from index.html
export const CORS_PROXY_URL = config.corsProxyUrl || 'https://binaural.me/cors_proxy/'

export function getProxiedUrl(url:string){
  const heads = ['http://', 'https://']
  let rv = url
  heads.forEach((head) => {
    if (url.substring(0, head.length) === head){
      rv = url.substring(head.length)
    }
  })
  rv = `${CORS_PROXY_URL}${rv}`

  return rv
}
