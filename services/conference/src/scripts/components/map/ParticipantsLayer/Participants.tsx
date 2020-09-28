import {useStore} from '@hooks/ParticipantsStore'
import {PARTICIPANT_SIZE} from '@models/Participant'
import {useObserver} from 'mobx-react-lite'
import React from 'react'
import {MemoedLocalParticipant as LocalParticipant} from './LocalParticipant'
import {MouseCursor} from './MouseCursor'
import {MemoedParticipant as Participant} from './Participant'

export const ParticipantsLayer: React.FC<{}> = (props) => {
  const store = useStore()
  const ids = useObserver(() => Array.from(store.remote.keys()).filter(id => (
    store.find(id)!.perceptibility.visibility
  )))
  const localId = useObserver(() => store.localId)
  const remoteElements = ids.map(id => <Participant key={id} participantId={id} size={PARTICIPANT_SIZE} />)
  const localElement = (<LocalParticipant key={localId} participantId={localId} size={PARTICIPANT_SIZE} />)

  const mouseIds = useObserver(() => Array.from(store.remote.keys()).filter(id => (
    store.find(id)!.mousePosition
  )))
  const localMousePosition = useObserver(() => store.local.get().mousePosition)
  if (localMousePosition) {
    mouseIds.push(store.localId)
  }
  const mouseCursors = mouseIds.map(id => <MouseCursor key={id} participantId={id} />)

  return(
    <div>
      {remoteElements}
      {localElement}
      {mouseCursors}
    </div>
  )
}

ParticipantsLayer.displayName = 'ParticipantsLayer'
