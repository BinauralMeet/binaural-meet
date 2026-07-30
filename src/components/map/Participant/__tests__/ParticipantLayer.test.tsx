import {describe, it, expect, vi, beforeEach} from 'vitest'
import {render} from '@testing-library/react'

const {urlParametersMock, participantsMock} = vi.hoisted(() => {
  const local = {
    id: 'local1', zIndex: 0, pose: {position: [0, 0], orientation: 0},
    mouse: {show: false, position: [0, 0]},
    landmarks: undefined, vrmRig: undefined,
    isVrm: () => false, showVrm: () => false,
  }

  return {
    urlParametersMock: {testBot: null as string | null},
    participantsMock: {
      remote: new Map(),
      playback: new Map(),
      yarnPhones: new Set<string>(),
      localId: 'local1',
      local,
      find: (id: string) => (id === 'local1' ? local : undefined),
    },
  }
})

vi.mock('@models/url', () => ({urlParameters: urlParametersMock}))
vi.mock('@stores/', () => ({participants: participantsMock}))
vi.mock('../LocalParticipant', () => ({MemoedLocalParticipant: () => null}))
vi.mock('../MouseCursor', () => ({MouseCursor: () => null}))
vi.mock('../Participant', () => ({PlaybackParticipant: () => null}))
vi.mock('../RemoteParticipant', () => ({RemoteParticipant: () => null}))
vi.mock('@models/utils/vrm', () => ({
  applyMPLandmarkToVrm: vi.fn(),
  updateVrmAvatar: vi.fn(() => Promise.resolve({})),
}))
vi.mock('@models/utils/vrmIK', () => ({
  extractVrmRig: vi.fn(),
  applyVrmRig: vi.fn(),
}))

// eslint-disable-next-line import/first
import {ParticipantLayer} from '../ParticipantLayer'
// eslint-disable-next-line import/first
import {updateVrmAvatar} from '@models/utils/vrm'

describe('ParticipantLayer', () => {
  beforeEach(() => {
    urlParametersMock.testBot = null
    participantsMock.local.isVrm = () => false
    vi.clearAllMocks()
  })

  it('renders the full participant layer when not in test-bot mode', () => {
    const vrmAvatars = {local: undefined, remotes: new Map(), delete: vi.fn()} as any
    const {container} = render(<ParticipantLayer vrmAvatars={vrmAvatars} />)

    expect(container.querySelector('div[style*="absolute"]')).not.toBeNull()
    expect(container.innerHTML).not.toBe('<div></div>')
  })

  it('renders only a placeholder div while isTestBot is set', () => {
    urlParametersMock.testBot = 'bot1'
    const vrmAvatars = {local: undefined, remotes: new Map(), delete: vi.fn()} as any

    const {container} = render(<ParticipantLayer vrmAvatars={vrmAvatars} />)

    expect(container.innerHTML).toBe('<div></div>')
  })

  //  The mount effect syncs the local participant's VRM avatar via updateVrmAvatar() -- this is
  //  the concrete behavior the isTestBot early-return (inside the effect, not around it) is meant
  //  to gate: sync must run in normal mode and must be fully skipped in test-bot mode.
  it('syncs the local VRM avatar on mount when not in test-bot mode', () => {
    participantsMock.local.isVrm = () => true
    const vrmAvatars = {local: undefined, remotes: new Map(), delete: vi.fn()} as any

    render(<ParticipantLayer vrmAvatars={vrmAvatars} />)

    expect(updateVrmAvatar).toHaveBeenCalled()
  })

  it('skips VRM avatar sync entirely in test-bot mode', () => {
    urlParametersMock.testBot = 'bot1'
    participantsMock.local.isVrm = () => true
    const vrmAvatars = {local: undefined, remotes: new Map(), delete: vi.fn()} as any

    render(<ParticipantLayer vrmAvatars={vrmAvatars} />)

    expect(updateVrmAvatar).not.toHaveBeenCalled()
  })
})
