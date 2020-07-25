import React from 'react'
import {BaseConfigurationProps, PluginBase} from '../PluginBase'
import {registerPlugin} from '../registery'

export const LOCAL_PARTICIPANT_CONFIG = 'local_participant_type'

interface Props extends BaseConfigurationProps {
  id: string
}

const LocalParticipantConfig: React.FC<Props> = (props: Props) => {
  const {
    closeDialog,
  } = props

  return <div>
    {'LocalParticipantConfig,LocalParticipantConfig,LocalParticipantConfig,LocalParticipantConfig,LocalParticipantConfig'}
    <div>
      <button onClick={closeDialog}>close dialog</button>
    </div>
  </div>
}


const localParticipantPlugin: PluginBase<Props> = {
  type: LOCAL_PARTICIPANT_CONFIG,
  ConfigurationRenderer: LocalParticipantConfig,
}

registerPlugin(localParticipantPlugin)
