
const ConnectionStates = {
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
}

type ConnectionStatesType =
  typeof ConnectionStates.DISCONNECTED |
  typeof ConnectionStates.CONNECTING |
  typeof ConnectionStates.CONNECTED

export { ConnectionStates }
export type { ConnectionStatesType }

