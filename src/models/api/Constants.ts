
const ConnectionStates = {
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
}
export const contentTrackCarrierName = '_contentTrackCarrier'
export const roomInfoPeeperName = '_roomInfoPeeper'

type ConnectionStatesType =
  typeof ConnectionStates.DISCONNECTED |
  typeof ConnectionStates.CONNECTING |
  typeof ConnectionStates.CONNECTED

export { ConnectionStates }
export type { ConnectionStatesType }

