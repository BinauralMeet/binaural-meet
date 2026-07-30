//  Pure logic for DataConnection.ts's send queue (messagesToSendToRelay), deliberately free of any
//  @stores/@models singleton imports so it's unit-testable in isolation -- DataConnection.ts itself
//  transitively imports the whole app singleton graph (Conference, participants, recorder, ...),
//  which isn't safe to construct outside a real browser (e.g. needs a real AudioContext).
import type {BMMessage} from './DataMessage'
import type {MergeStrategy} from './MessageTypeRegistry'

//  Finds the index of an already-queued message this new one should merge/overwrite into,
//  or -1 if it should be queued as a new entry. `merge === 'instant'` (e.g. CHAT_MESSAGE, a log
//  of discrete events rather than a "latest value wins" field) always returns -1: two such
//  messages queued back-to-back before a flush must never collapse into one (a past bug let a
//  rapid burst of chat messages to the same recipient silently drop all but the last).
//  `roomPropName`, when set, additionally requires the queued message's first tuple element to
//  match (ROOM_PROP multiplexes many differently-named properties under one message type, unlike
//  every other type here, so "same type -> same queue slot" isn't a valid dedup key on its own).
export function findQueueSlot(
  queue: BMMessage[], msg: BMMessage, merge: MergeStrategy, roomPropName: string | undefined,
): number {
  if (merge === 'instant') { return -1 }
  return queue.findIndex(m => {
    if (m.t !== msg.t || m.r !== msg.r || m.p !== msg.p || m.d !== msg.d) { return false }
    if (roomPropName === undefined) { return true }
    try {
      return (JSON.parse(m.v) as [string, string])[0] === roomPropName
    } catch {
      return false
    }
  })
}
