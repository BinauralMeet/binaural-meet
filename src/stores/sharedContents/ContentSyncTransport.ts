import {ISharedContent} from '@models/ISharedContent'
import {TrackRoles} from '@models/conference/RtcConnection'

// Lets SharedContents request the network-facing conference actions it needs
// (sending content sync messages, tearing down a locally-owned RTC track)
// without importing the conference singleton directly, which would create a
// store<->model circular dependency (models/conference already imports this
// store for content/RTC-track bookkeeping, so the dependency must stay
// one-directional: conference -> contents, not the reverse).
// Conference injects itself as the implementation via
// SharedContents.setSyncTransport() once both singletons exist.
export interface ContentSyncTransport {
  readonly localPeer: string
  sendContentUpdateRequest(pid: string, updatedContents: ISharedContent[]): void
  sendContentRemoveRequest(pid: string, removedIds: string[]): void
  requestContentUpdateById(cids: string[]): void
  removeLocalTrackByRole(stopTrack: boolean, role: TrackRoles): void
}
