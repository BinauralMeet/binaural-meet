import {useStore} from '@hooks/ParticipantsStore'
import React from 'react'
import {PluginBase} from '../PluginBase'
import {registerPlugin} from '../registery'


export const LOCAL_PARTICIPANT_CONFIG = 'local_participant_type'

interface Props {
  id: string
}

const LocalParticipantConfig: React.FC<Props> = (props: Props) => {
  const participants = useStore()
  const local = participants.local.get()

  return <div>
    Name: <input type="text" name="name" value={local.information.name} /><br />
  </div>
}


const localParticipantPlugin: PluginBase<Props> = {
  type: LOCAL_PARTICIPANT_CONFIG,
  ConfigurationRenderer: LocalParticipantConfig,
}

registerPlugin(localParticipantPlugin)
