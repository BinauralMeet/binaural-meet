import {useStore} from '@hooks/ParticipantsStore'
import {useObserver} from 'mobx-react-lite'
import React from 'react'
import Participant from './Participant'

export const ParticipantsLayer: React.FC<{}> = () => {
  const ids = useObserver(() => Array.from(useStore().remote.keys()))
  const elements = ids.map(id => <Participant key={id} participantId={id} size={50} />)

  return <div>
    {elements}
  </div>
}
