import {useStore} from '@hooks/ParticipantsStore'
import {PARTICIPANT_SIZE} from '@models/Participant'
import {useObserver} from 'mobx-react-lite'
import React from 'react'
import {MemoedLocalParticipant as LocalParticipant} from './LocalParticipant'
import {MemoedParticipant as Participant} from './Participant'

export const ParticipantsLayer: React.FC<{}> = () => {
  const store = useStore()
  const ids = useObserver(() => Array.from(store.remote.keys()).filter(id => (
    store.find(id).perceptibility.visibility
  )))
  const localId = useObserver(() => store.localId)
  const remoteElements = ids.map(id => <Participant key={id} participantId={id} size={PARTICIPANT_SIZE} />)
  const localElement = (<LocalParticipant key={localId} participantId={localId} size={PARTICIPANT_SIZE} />)

  return(
    <div>
      {remoteElements}
      {localElement}
    </div>
  )
}

ParticipantsLayer.displayName = 'ParticipantsLayer'
