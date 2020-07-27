import {useStore} from '@hooks/ParticipantsStore'
import {DoneTwoTone} from '@material-ui/icons'
import {Information} from '@models/Participant'
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

  return {value, onChange: handler}
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
  const avatarSrc = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File|null>()

  function submitHandler(ev: React.FormEvent) {
    ev.preventDefault()
    closeDialog()
    if (submitType === 'cancel') { return }
    if (submitType === 'clear') {
      localStorage.removeItem('name')
      localStorage.removeItem('email')
      localStorage.removeItem('avatarSrc')
      local.information.name = 'Anonymous'
      local.information.email = undefined
      local.information.avatarSrc = undefined

      return
    }
    local.information.name = name.value
    local.information.email = email.value

    function saveToStorage() {
      let storage = sessionStorage
      if (submitType === 'local') {
        storage = localStorage
      }
      console.log(storage === localStorage ? 'Save to localStorage' : 'Save to sessionStorage')
      if (local.information.name) { storage.setItem('name', local.information.name) }
      if (local.information.email) { storage.setItem('email', local.information.email) }
      if (local.information.avatarSrc) { storage.setItem('avatarSrc', local.information.avatarSrc) }
    }

    if (file) {
      const formData = new FormData()
      formData.append('access_token', 'e9889a51fca19f2712ec046016b7ec0808953103e32cd327b91f11bfddaa8533')
      formData.append('imagedata', file)
      const promise = fetch('https://upload.gyazo.com/api/upload', {method: 'POST', body: formData})
      .then(response => response.json())
      .then((responseJson) => {
        // console.log("URL = " + responseJson.url)
        //  To do, add URL and ask user position to place the image
        local.information.avatarSrc = responseJson.url
        console.log(`info.avatar = ${local.information.avatarSrc}`)
      }).then(() => {
        saveToStorage()
      })
    }else {
      saveToStorage()
    }
  }

  return <form onSubmit = {submitHandler}>
    Name: <input type="text" {...name} /> <br />
    Email: <input type="text" {...email} /> <br />
    Avatar: <input type="file" ref={avatarSrc} onChange={(ev) => {
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
