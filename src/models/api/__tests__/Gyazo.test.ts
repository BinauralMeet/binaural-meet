import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest'

//  GyazoAuth imports the conference singleton only for the token exchange; these tests never
//  reach it, and loading the real one would drag in mediasoup and the whole store graph.
vi.mock('@models/conference', () => ({conference: {exchangeGyazoCode: vi.fn()}}))

import {uploadToGyazo} from '../Gyazo'
import {gyazoAuth, handleGyazoCallback} from '../GyazoAuth'

const TOKEN_KEY = 'gyazoAccessToken'

beforeEach(() => { localStorage.clear() })
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })

//  `listAnswers` may be a function of the description the upload carried, to play the part of
//  Gyazo listing the image that was just uploaded.
function stubFetch(listAnswers: Array<{status?: number, body: any}>, uploaded?: (desc: string) => any){
  const calls: string[] = []
  let desc = ''
  vi.stubGlobal('fetch', vi.fn((url: string, init?: any) => {
    calls.push(`${init?.method || 'GET'} ${url.split('?')[0]}`)
    if (url.startsWith('https://upload.gyazo.com/')){
      desc = (init.body as FormData).get('desc') as string
      return Promise.resolve({status: 0, ok: false} as any)    //  what a no-cors POST resolves to
    }
    if (uploaded){ return Promise.resolve({status: 200, ok: true, json: () => Promise.resolve(uploaded(desc))} as any) }
    const answer = listAnswers.length > 1 ? listAnswers.shift()! : listAnswers[0]

    return Promise.resolve({status: answer.status ?? 200, ok: (answer.status ?? 200) < 400,
      json: () => Promise.resolve(answer.body)} as any)
  }))

  return calls
}

describe('uploadToGyazo', () => {
  it('refuses without a connected account, so the caller falls back to Google Drive', async () => {
    const calls = stubFetch([{body: []}])
    await expect(uploadToGyazo(new Blob(['x']))).rejects.toBe('not connected')
    expect(calls).toEqual([])
  })

  it('uploads with the user token and finds its own image by the marker it carried', async () => {
    localStorage.setItem(TOKEN_KEY, 'user-token')
    //  Someone else's newer image comes first in the list; ours must still be the one picked.
    const calls = stubFetch([], desc => [
      {url: 'https://i.gyazo.com/other.png', metadata: {desc: 'Binaural Meet ffffffff'}},
      {url: 'https://i.gyazo.com/ours.png', metadata: {desc}},
    ])
    await expect(uploadToGyazo(new Blob(['x']))).resolves.toBe('https://i.gyazo.com/ours.png')
    expect(calls).toEqual(['POST https://upload.gyazo.com/api/upload', 'GET https://api.gyazo.com/api/images'])
  })

  it('gives up (so Drive takes over) when its image never shows up -- a no-cors failure looks like this', async () => {
    vi.useFakeTimers()
    localStorage.setItem(TOKEN_KEY, 'user-token')
    stubFetch([{body: [{url: 'https://i.gyazo.com/old.png', metadata: {desc: ''}}]}])
    const p = uploadToGyazo(new Blob(['x']))
    const settled = p.catch(e => e)
    await vi.runAllTimersAsync()
    expect(await settled).toBe('uploaded image not found')
    vi.useRealTimers()
  })

  it('forgets a token the user has revoked', async () => {
    localStorage.setItem(TOKEN_KEY, 'revoked')
    gyazoAuth.connected = true
    stubFetch([{status: 401, body: {message: 'You are not authorized.'}}])
    await expect(uploadToGyazo(new Blob(['x']))).rejects.toMatch('revoked')
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull()
    expect(gyazoAuth.connected).toBe(false)
  })
})

describe('handleGyazoCallback', () => {
  function at(search: string){ window.history.replaceState(null, '', `/${search}`) }
  afterEach(() => { at('') })

  it('lets the app start on an ordinary load', () => {
    at('?room=haselab')
    expect(handleGyazoCallback()).toBe(false)
  })

  it('ignores a code whose state is not the one this browser asked for', () => {
    localStorage.setItem('gyazoOAuthState', 'mine')
    at('?code=c&state=someone-elses')
    expect(handleGyazoCallback()).toBe(false)
  })

  it('in the popup, hands the code to the opener and keeps the app from starting', () => {
    localStorage.setItem('gyazoOAuthState', 'mine')
    at('?code=the-code&state=mine')
    const postMessage = vi.fn()
    vi.stubGlobal('opener', {postMessage})
    const close = vi.spyOn(window, 'close').mockImplementation(() => {})
    expect(handleGyazoCallback()).toBe(true)
    expect(postMessage).toHaveBeenCalledWith({type: 'bmGyazoOAuthCode', code: 'the-code', state: 'mine'},
      window.location.origin)
    expect(close).toHaveBeenCalled()
  })
})
