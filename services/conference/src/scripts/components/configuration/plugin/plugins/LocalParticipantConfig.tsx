import React from 'react'
import {PluginBase} from '../PluginBase'
import {registerPlugin} from '../registery'

export const LOCAL_PARTICIPANT_CONFIG = 'local_participant_type'

interface Props {
  id: string
}

const LocalParticipantConfig: React.FC<Props> = (props: Props) => {
  return <div>
    {'LocalParticipantConfig,LocalParticipantConfig,LocalParticipantConfig,LocalParticipantConfig,LocalParticipantConfig'}
  </div>
}


const localParticipantPlugin: PluginBase<Props> = {
  type: LOCAL_PARTICIPANT_CONFIG,
  ConfigurationRenderer: LocalParticipantConfig,
}

registerPlugin(localParticipantPlugin)
