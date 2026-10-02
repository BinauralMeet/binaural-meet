//  A small diary of connection events, kept in localStorage and sent to the main server on the
//  next join (bm workspace doc `bmMediasoupServer-architecture#client-log`).
//
//  The server can see that a socket closed and with which code, but not why: a 1005 there is
//  just as likely "the user reloaded because their audio stopped" as "our own reconnect logic
//  closed it". The client knows -- but at the moment it knows, its sockets are usually the very
//  thing that is down, and a reload wipes memory. So events go to localStorage first and travel
//  with the next successful join, which is also when the server learns who this client is.
const STORAGE_KEY = 'bmConnectionLog'
const MAX_EVENTS = 40
const MAX_DETAIL = 200

export interface ConnectionEvent{
  t: string           //  ISO time on the client
  k: string           //  kind: 'rtcClose', 'dataClose', 'reconnectRtc', 'transport', 'unload', ...
  d?: string          //  short detail (close code/reason, transport state, ...)
}

function load(): ConnectionEvent[]{
  try{
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')

    return Array.isArray(parsed) ? parsed : []
  }catch{
    return []
  }
}
function save(events: ConnectionEvent[]){
  try{
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events.slice(-MAX_EVENTS)))
  }catch{
    //  Storage full or blocked: the diary is a diagnostic, never a reason to fail.
  }
}

export function noteConnectionEvent(kind: string, detail?: string){
  const events = load()
  events.push({t: new Date().toISOString(), k: kind, d: detail?.slice(0, MAX_DETAIL)})
  save(events)
}

export function describeClose(ev?: CloseEvent){
  return ev ? `code:${ev.code} clean:${ev.wasClean}${ev.reason ? ` reason:${ev.reason}` : ''}` : ''
}

//  Returns everything recorded since the last report and forgets it.
export function takeConnectionEvents(): ConnectionEvent[]{
  const events = load()
  save([])

  return events
}

export function clientEnvironment(){
  const nav = navigator as any

  return {
    ua: navigator.userAgent,
    online: navigator.onLine,
    net: nav.connection?.effectiveType as string|undefined,
  }
}

let watching = false
//  Network changes are recorded as they happen; they explain a 1006 better than anything else.
export function watchNetworkEvents(){
  if (watching){ return }
  watching = true
  window.addEventListener('online', () => noteConnectionEvent('online'))
  window.addEventListener('offline', () => noteConnectionEvent('offline'))
}
