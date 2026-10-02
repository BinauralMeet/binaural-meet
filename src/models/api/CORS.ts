// config.js
declare const config:any             //  from ../../config.js included from index.html
export const CORS_PROXY_URL = config.corsProxyUrl || 'https://binaural.me/cors_proxy/'

export function getProxiedUrl(url:string){
  return `${CORS_PROXY_URL}${url}`
}

//  The proxy is for other sites only: a URL on the page's own origin needs no CORS help, and the
//  proxy is fenced off from this host anyway (host doc `bm-cors-proxy`), so going through it would
//  only fail slowly.
export function proxiedUnlessSameOrigin(url:string){
  try{
    if (new URL(url, window.location.href).origin === window.location.origin){ return url }
  }catch{
    //  not a URL we can parse: let the proxy have it, as before
  }

  return getProxiedUrl(url)
}

//  Runs `attempt` on the URL as given and, only if that fails, retries once through the CORS
//  proxy. Direct-first rather than always-proxy on purpose: the resources this is used for
//  (binaural.me's VRM avatar collection) are same-origin in the usual deployment and are only
//  blocked when the app is served from somewhere else, the proxy accepts a whitelist of origins
//  rather than all of them, and a host that does send Access-Control-Allow-Origin should never
//  be routed through it at all.
export function withCorsRetry<T>(url:string, attempt:(url:string)=>Promise<T>): Promise<T>{
  return attempt(url).catch((e) => {
    const proxied = getProxiedUrl(url)
    if (proxied === url){ throw e }

    return attempt(proxied)
  })
}
