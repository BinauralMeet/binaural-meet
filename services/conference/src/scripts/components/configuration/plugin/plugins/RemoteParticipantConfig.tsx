import {useStore} from '@hooks/ParticipantsStore'
import React, {useState} from 'react'
import {BaseConfigurationProps, PluginBase} from '../PluginBase'
import {registerPlugin} from '../registery'

export const REMOTE_PARTICIPANT_CONFIG = 'remote_participant_type'

interface Props extends BaseConfigurationProps {
  id: string
}

const RemoteParticipantConfig: React.FC<Props> = (props: Props) => {
  const {
    closeDialog,
  } = props
  const [submitType, setSubmitType] = useState('')
  const participants = useStore()

  function submitHandler(ev: React.FormEvent) {
    ev.preventDefault()
    closeDialog()
  }

  return  <form onSubmit = {submitHandler} />
}


const remoteParticipantPlugin: PluginBase<Props> = {
  type: REMOTE_PARTICIPANT_CONFIG,
  ConfigurationRenderer: RemoteParticipantConfig,
}

registerPlugin(remoteParticipantPlugin)
