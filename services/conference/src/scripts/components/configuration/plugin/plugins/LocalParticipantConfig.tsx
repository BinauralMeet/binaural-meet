import {useStore} from '@hooks/ParticipantsStore'
import {Information} from '@models/Participant'
import React, {useState} from 'react'
import {PluginBase} from '../PluginBase'
import {registerPlugin} from '../registery'

export const LOCAL_PARTICIPANT_CONFIG = 'local_participant_type'

interface Props {
  id: string
}


function useInput<T>(initialValue:T) {
  const [value, set] = useState(initialValue)

  function handler(e:React.ChangeEvent<HTMLInputElement>) {
    (set as any)(e.target.value)
  }

  return {value, onChange: handler}
}

const LocalParticipantConfig: React.FC<Props> = (props: Props) => {
  const participants = useStore()
  const local = participants.local.get()
  const name = useInput(local.information.name)
  const email = useInput(local.information.email)
  function handleSubmit(ev: React.FormEvent) {
    local.information.name = name.value
    ev.preventDefault()
  }

  return <form onSubmit={handleSubmit}>
    Name: <input type="text" {...name} /> <br />
    Email: <input type="text" {...email} /> <br />
    <input type="submit" value=" Submit " />
  </form>
}


const localParticipantPlugin: PluginBase<Props> = {
  type: LOCAL_PARTICIPANT_CONFIG,
  ConfigurationRenderer: LocalParticipantConfig,
}

registerPlugin(localParticipantPlugin)
