// config.js
declare const config:any             //  from ../../config.js included from index.html
export const CORS_PROXY_URL = config.corsProxyUrl || 'https://binaural.me/cors_proxy/'

export function getProxiedUrl(url:string){
  return `${CORS_PROXY_URL}${url}`
}
