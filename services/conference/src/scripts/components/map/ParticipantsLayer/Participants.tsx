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
  const localElement = (<LocalParticipant key={'local'} participantId={localId} size={PARTICIPANT_SIZE} />)

  const mouseIds = useObserver(() => Array.from(store.remote.keys()).filter(id => (
    store.find(id)!.mousePosition
  )))
  const remoteMouseCursors = mouseIds.map(id => <MouseCursor key={`M_${id}`} participantId={id} />)

  const localMousePosition = useObserver(() => store.local.get().mousePosition)
  const localMouseCursor = localMousePosition ? <MouseCursor key={'M_local'} participantId={localId} /> : undefined

  return(
    <div>
      {remoteElements}
      {localElement}
      {remoteMouseCursors}
      {localMouseCursor}
    </div>
  )
}

ParticipantsLayer.displayName = 'ParticipantsLayer'
