//  Connects this browser to the user's own Gyazo account (OAuth), so that pasted images are
//  uploaded by the user, into their own Gyazo, and only the resulting URL is shared in the room.
//
//  Flow: a popup goes to Gyazo's authorize page; Gyazo sends it back to `gyazoRedirectUri` (the
//  app's own top page) with ?code=...&state=...; that page, seeing it was opened as this popup,
//  hands the code to its opener and closes (handleGyazoCallback, called before the app starts).
//  The opener asks the main server to trade the code for an access token -- the trade needs the
//  app's client_secret, which only the server has -- and keeps the token in localStorage.
import {conference} from '@models/conference'
import {observable} from 'mobx'

declare const config: any             //  from ../../config.js included from index.html

const TOKEN_KEY = 'gyazoAccessToken'
const STATE_KEY = 'gyazoOAuthState'
const MESSAGE_TYPE = 'bmGyazoOAuthCode'

export const gyazoAuth = observable({connected: !!readToken()})

function readToken(){
  try{ return localStorage.getItem(TOKEN_KEY) || '' }catch{ return '' }
}
export function getGyazoToken(){ return readToken() }
export function forgetGyazoToken(){
  try{ localStorage.removeItem(TOKEN_KEY) }catch{ /* nothing to forget */ }
  gyazoAuth.connected = false
}
export function gyazoConfigured(){ return !!config.gyazoClientId }
function redirectUri(){ return config.gyazoRedirectUri || `${window.location.origin}/` }

//  Runs first thing on page load. True means "this page is only the OAuth popup's landing page":
//  the code was passed on and the window is closing, so the app must not start here.
export function handleGyazoCallback(): boolean{
  const params = new URLSearchParams(window.location.search)
  const code = params.get('code')
  const state = params.get('state')
  if (!code || !state){ return false }
  let expected = ''
  try{ expected = localStorage.getItem(STATE_KEY) || '' }catch{ /* storage blocked */ }
  if (state !== expected){ return false }   //  not ours: leave the page (and its query) alone
  if (window.opener){
    window.opener.postMessage({type: MESSAGE_TYPE, code, state}, window.location.origin)
    window.close()

    return true
  }
  //  Opened without an opener (popup turned into a tab by the browser): nothing to hand the code
  //  to, so drop it from the address bar and start the app normally.
  window.history.replaceState(null, '', window.location.pathname)

  return false
}

//  Opens Gyazo's consent page and resolves once this browser holds the user's own token.
export function connectGyazo(): Promise<void>{
  return new Promise<void>((resolve, reject) => {
    if (!gyazoConfigured()){ reject('gyazo is not configured'); return }
    const state = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(b => b.toString(16).padStart(2, '0')).join('')
    try{ localStorage.setItem(STATE_KEY, state) }catch{ reject('storage blocked'); return }
    const url = 'https://gyazo.com/oauth/authorize?' + new URLSearchParams({
      client_id: config.gyazoClientId, redirect_uri: redirectUri(), response_type: 'code', state})
    const popup = window.open(url, 'bmGyazoAuth', 'width=520,height=720')
    if (!popup){ reject('popup blocked'); return }

    const onMessage = (ev: MessageEvent) => {
      if (ev.origin !== window.location.origin || ev.data?.type !== MESSAGE_TYPE){ return }
      if (ev.data.state !== state){ return }
      window.removeEventListener('message', onMessage)
      conference.exchangeGyazoCode(ev.data.code, redirectUri()).then((token) => {
        try{ localStorage.setItem(TOKEN_KEY, token) }catch{ /* kept for this session only */ }
        gyazoAuth.connected = true
        resolve()
      }).catch(reject)
    }
    window.addEventListener('message', onMessage)
  })
}
