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
      <div style={{width:18, height:30, left:2500, top:2500, position:'absolute'}}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 100">
          <polygon points="32,100 53,92 36,57 60,56 0,0 0,81 16,65 32,100" stroke="black" fill="#f88" strokeWidth="6" />
        </svg>
      </div>
    </div>
  )
}

ParticipantsLayer.displayName = 'ParticipantsLayer'
