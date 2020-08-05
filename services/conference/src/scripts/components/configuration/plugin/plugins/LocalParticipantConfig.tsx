import {useStore} from '@hooks/ParticipantsStore'
import Container from '@material-ui/core/Container'
import {uploadToGyazo} from '@models/api/Gyazo'
import {defaultInformation} from '@models/Participant'
import React, {useState} from 'react'
import {BaseConfigurationProps, PluginBase} from '../PluginBase'
import {registerPlugin} from '../registery'
import {AudioControl} from './localParticipantConfig/AudioControl'

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
      local.setInformation(defaultInformation)

      return
    }
    const info = Object.assign({}, defaultInformation)
    info.name = name.value
    info.email = email.value
    info.avatarSrc = local.information.avatarSrc

    if (file) {
      uploadToGyazo(file).then(({url, size}) => {
        info.avatarSrc = url
        local.setInformation(info)
        console.log(`info.avatar = ${local.information.avatarSrc}`)
        local.saveInformationToStorage(submitType === 'local')
      })
    }else {
      local.setInformation(info)
      local.saveInformationToStorage(submitType === 'local')
    }
  }

  const form = <form key="information" onSubmit = {submitHandler}>
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

  return <>
    <Container>{form}</Container>
    <AudioControl key="audiocontrol" />,
  </>
}


const localParticipantPlugin: PluginBase<Props> = {
  type: LOCAL_PARTICIPANT_CONFIG,
  ConfigurationRenderer: LocalParticipantConfig,
}

registerPlugin(localParticipantPlugin)
