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
