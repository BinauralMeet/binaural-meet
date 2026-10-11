import {describe, it, expect, vi, beforeEach} from 'vitest'

//  testBot mode (headless load-test bot, see docs/TestingGuide.md and testByChrome.sh) has no
//  human to click TheEntrance's "Enter The Venue" button -- the only other caller of
//  preEnter()/enter() -- and ErrorInfo's constructor deliberately suppresses that dialog for
//  testBot (clears the initial 'entrance' error type). Without an explicit auto-enter call, the
//  bot never actually joins the room over RTC, so its dummy mic/camera tracks have no transport
//  to send through: this is the root cause of "audio and video don't come out" in testBot mode.
const {urlParametersMock, participantsMock, mapMock} = vi.hoisted(() => ({
  urlParametersMock: {testBot: '1' as string | null, skipEntrance: null as string | null, room: 'debugroom'},
  participantsMock: {
    local: {
      information: {name: '', role: ''},
      physics: {awayFromKeyboard: false},
      muteAudio: false,
      muteVideo: false,
      pose: {position: [0, 0]},
      sendInformation: vi.fn(),
    },
  },
  mapMock: {keyInputUsers: new Set<string>()},
}))

vi.mock('@models/url', () => ({urlParameters: urlParametersMock}))
vi.mock('@stores/participants/Participants', () => ({default: participantsMock}))
vi.mock('@stores/map/Map', () => ({default: mapMock}))
vi.mock('@models/locales', () => ({t: (key: string) => key}))
vi.mock('@models/Participant', () => ({defaultInformation: {name: '', role: 'guest'}}))

// eslint-disable-next-line import/first
import {ErrorInfo} from '../ErrorInfo'

function makeTransport() {
  return {
    isRtcConnected: () => true,
    isDataConnected: () => true,
    getLocalMicTrack: () => undefined,
    setLocalMicTrack: vi.fn(() => Promise.resolve()),
    setLocalCameraTrack: vi.fn(() => Promise.resolve()),
    addRtcDisconnectListener: vi.fn(),
    removeRtcDisconnectListener: vi.fn(),
    isNearestVideoMuted: () => false,
    isNearestAudioMuted: () => false,
    preEnter: vi.fn(() => Promise.resolve(false)),
    enter: vi.fn(() => Promise.resolve('peer1')),
  }
}

describe('ErrorInfo testBot auto-enter', () => {
  beforeEach(() => {
    urlParametersMock.testBot = '1'
    vi.stubGlobal('navigator', {
      ...globalThis.navigator,
      mediaDevices: {enumerateDevices: () => Promise.resolve([])},
    })
  })

  it('joins the room itself since there is no UI for a headless bot to click', () => {
    const errorInfo = new ErrorInfo()
    const transport = makeTransport()
    errorInfo.setConferenceStatusTransport(transport)

    errorInfo.connectionStart()

    expect(transport.preEnter).toHaveBeenCalledWith('debugroom')
  })

  it('enters as a guest once preEnter resolves without requiring login', async () => {
    const errorInfo = new ErrorInfo()
    const transport = makeTransport()
    errorInfo.setConferenceStatusTransport(transport)

    errorInfo.connectionStart()
    await Promise.resolve()
    await Promise.resolve()

    expect(transport.enter).toHaveBeenCalledWith('debugroom', undefined, undefined)
    expect(participantsMock.local.information.role).toBe('guest')
  })

  it('does not attempt to enter when the room requires login', async () => {
    const errorInfo = new ErrorInfo()
    const transport = makeTransport()
    transport.preEnter = vi.fn(() => Promise.resolve(true))
    errorInfo.setConferenceStatusTransport(transport)

    errorInfo.connectionStart()
    await Promise.resolve()
    await Promise.resolve()

    expect(transport.enter).not.toHaveBeenCalled()
  })
})

describe('ErrorInfo after a working connection drops', () => {
  it('shows "reconnecting" first, and the firewall error only if it does not come back', () => {
    vi.useFakeTimers()
    try{
      const errorInfo = new ErrorInfo()
      let up = true
      const transport = {...makeTransport(), isRtcConnected: () => up}
      errorInfo.setConferenceStatusTransport(transport)
      errorInfo.checkConnection()
      expect(errorInfo.type).not.toBe('reconnecting')

      up = false
      errorInfo.checkConnection()
      expect(errorInfo.type).toBe('reconnecting')
      vi.advanceTimersByTime(21 * 1000)
      expect(errorInfo.type).toBe('rtcTransports')

      up = true
      vi.advanceTimersByTime(1000)
      expect(errorInfo.types.has('rtcTransports')).toBe(false)
      expect(errorInfo.types.has('reconnecting')).toBe(false)
    }finally{ vi.useRealTimers() }
  })

  it('does not call the very first connection attempt a reconnect', () => {
    const errorInfo = new ErrorInfo()
    errorInfo.setConferenceStatusTransport({...makeTransport(), isRtcConnected: () => false})
    errorInfo.checkConnection()
    expect(errorInfo.type).toBe('rtcTransports')
  })
})

describe('ErrorInfo mic check', () => {
  it('follows mute and the mic track as they change, without re-checking on a timer', async () => {
    const {observable, runInAction} = await import('mobx')
    vi.useFakeTimers()
    const savedLocal = participantsMock.local
    try{
      urlParametersMock.testBot = null
      const local = observable({...savedLocal, muteAudio: false, tracks: {audio: undefined as unknown}})
      participantsMock.local = local as any
      Object.assign(participantsMock, {localId: 'me'})
      let mic: unknown = undefined
      const errorInfo = new ErrorInfo()
      ;(errorInfo as any).audioInputs = [{kind: 'audioinput'}]
      errorInfo.setConferenceStatusTransport({...makeTransport(), getLocalMicTrack: () => mic as any})
      errorInfo.checkMic()
      expect(errorInfo.types.has('micPermission')).toBe(true)

      mic = {}
      runInAction(() => { local.tracks.audio = {} })    //  the mic opened
      expect(errorInfo.types.has('micPermission')).toBe(false)

      mic = undefined
      runInAction(() => { local.tracks.audio = undefined })   //  the mic went away while unmuted
      expect(errorInfo.types.has('micPermission')).toBe(true)

      runInAction(() => { local.muteAudio = true })
      expect(errorInfo.types.has('micPermission')).toBe(false)
      expect(vi.getTimerCount()).toBe(0)
    }finally{
      participantsMock.local = savedLocal
      urlParametersMock.testBot = '1'
      vi.useRealTimers()
    }
  })
})
