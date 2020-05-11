import {useStore} from '@hooks/ParticipantsStore'
import {useObserver} from 'mobx-react-lite'
import React from 'react'
import Participant from './Participant'

export const ParticipantsLayer: React.FC<{}> = () => {
  const store = useStore()
  const ids = useObserver(() => Array.from(store.remote.keys()).concat([store.localId]).filter(id => (
    store.find(id).perceptibility.visibility
  )))
  const elements = ids.map(id => <Participant key={id} participantId={id} size={50} />)

  return <div>
    {elements}
  </div>
}
