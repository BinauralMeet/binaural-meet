import {useStore} from '@hooks/ParticipantsStore'
import {uploadToGyazo} from '@models/api/Gyazo'
import {defaultInformation} from '@models/Participant'
import React, {useRef, useState} from 'react'
import {BaseConfigurationProps, PluginBase} from '../PluginBase'
import {registerPlugin} from '../registery'

export const LOCAL_PARTICIPANT_CONFIG = 'local_participant_type'

interface Props extends BaseConfigurationProps {
  id: string
}


function useInput<T>(initialValue:T) {
  const [value, set] = useState(initialValue)

  function handler(e:React.ChangeEvent<HTMLInputElement>) {
    (set as any)(e.target.value)
  }

  return {value, set, args: {value, onChange: handler}}
}

const LocalParticipantConfig: React.FC<Props> = (props: Props) => {
  const {
    closeDialog,
  } = props
  const [submitType, setSubmitType] = useState('')
  const participants = useStore()
  const local = participants.local.get()
  const name = useInput(local.information.name)
  const email = useInput(local.information.email)
  const [file, setFile] = useState<File|null>()

  function submitHandler(ev: React.FormEvent) {
    ev.preventDefault()
    closeDialog()
    if (submitType === 'cancel') { return }
    if (submitType === 'clear') {
      localStorage.removeItem('localParticipantInformation')
      sessionStorage.removeItem('localParticipantInformation')
      name.set(defaultInformation.name)
      email.set(defaultInformation.email)
      setFile(null)
      local.information.name = defaultInformation.name
      local.information.email = defaultInformation.email
      local.information.avatarSrc = defaultInformation.avatarSrc

      return
    }
    local.information.name = name.value
    local.information.email = email.value

    if (file) {
      uploadToGyazo(file).then(({url, size}) => {
        local.information.avatarSrc = url
        console.log(`info.avatar = ${local.information.avatarSrc}`)
        local.saveInformationToStorage(submitType === 'local')
      })
    }else {
      local.saveInformationToStorage(submitType === 'local')
    }
  }

  return <form onSubmit = {submitHandler}>
    Name: <input type="text" {...name.args} /> <br />
    Email: <input type="text" {...email.args} /> <br />
    Avatar: <input type="file" onChange={(ev) => {
      setFile(ev.target.files?.item(0))
    }} /> <br />
    <input type="submit" onClick={() => setSubmitType('session')} value="Save" /> &nbsp;
    <input type="submit" onClick={() => setSubmitType('local')} value="Save to browser" />
    <input type="submit" onClick={() => setSubmitType('clear')} value="Clear" />&nbsp;
    <input type="submit" onClick={() => setSubmitType('cancel')} value="Cancel" />
  </form>
}


const localParticipantPlugin: PluginBase<Props> = {
  type: LOCAL_PARTICIPANT_CONFIG,
  ConfigurationRenderer: LocalParticipantConfig,
}

registerPlugin(localParticipantPlugin)
