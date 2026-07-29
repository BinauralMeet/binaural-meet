//  Client-only. Single place to look up, per message type, how it should be merged when queued for
//  send (DataConnection.sendMessage), what to do with it on receive (DataSync.onBmMessage), what to
//  do with it during recorded-session playback (Player.playMessage), and whether it should be
//  recorded at all (Recorder.recordMessage) -- replacing four independently-maintained switch/Set
//  blocks that previously had to be updated in lockstep for every message type.
//
//  Migrated incrementally, type by type (see snazzy-petting-journal.md Phase 3). DataSync.ts's
//  receive dispatch and Recorder.ts's recordability check now consult only this registry (every
//  type that's ever received/recorded is registered). Player.ts's per-participant playback dispatch
//  and DataConnection.ts's send-side merge/dedup still fall back to their own legacy switch/Set
//  logic for types not covered here (content-type messages don't fit the per-participant onPlayback
//  shape, and the `merge` field isn't wired into sendMessage yet), so partial adoption stays safe.
import {MessageValue} from './DataMessageType'
import {MessageTypePayloadMap} from './DataMessagePayloads'
import {PlaybackParticipant} from '@stores/participants/RemoteOrPlaybackParticipant'

//  'instant': never merged with a same-type entry already queued -- always sent as its own
//  message (e.g. CHAT_MESSAGE, a log of discrete events rather than a "latest value wins" field).
export type MergeStrategy = 'overwrite' | 'objectArray' | 'stringArray' | 'instant'

export interface MessageTypeRegistryEntry<T extends MessageValue = MessageValue>{
  merge?: MergeStrategy
  recordable?: boolean
  onReceive?: (payload: MessageTypePayloadMap[T], from: string|undefined) => void
  onPlayback?: (payload: MessageTypePayloadMap[T], p: PlaybackParticipant) => void
}

const registry = new Map<MessageValue, MessageTypeRegistryEntry<any>>()

//  Multiple modules (DataSync for onReceive, Player for onPlayback, ...) each contribute the fields
//  they own for the same type -- merge rather than overwrite so registration order doesn't matter.
export function registerMessageType<T extends MessageValue>(type: T, entry: MessageTypeRegistryEntry<T>){
  const existing = registry.get(type)
  registry.set(type, existing ? {...existing, ...entry} : entry)
}

export function getMessageTypeEntry<T extends MessageValue>(type: T): MessageTypeRegistryEntry<T>|undefined{
  return registry.get(type)
}

export function getRecordableTypes(): MessageValue[]{
  return Array.from(registry.entries()).filter(([, e]) => e.recordable).map(([t]) => t)
}
