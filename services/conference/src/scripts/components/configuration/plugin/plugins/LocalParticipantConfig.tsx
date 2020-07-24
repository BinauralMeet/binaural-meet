import {useStore} from '@hooks/ParticipantsStore'
import {Information} from '@models/Participant'
import React, {useRef, useState} from 'react'
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
  const avatarSrc = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File|null>()
  function handleSubmit(ev: React.FormEvent) {
    local.information.name = name.value
    local.information.email = email.value
    if (file) {
      const formData = new FormData()
      formData.append('access_token', 'e9889a51fca19f2712ec046016b7ec0808953103e32cd327b91f11bfddaa8533')
      formData.append('imagedata', file)
      fetch('https://upload.gyazo.com/api/upload', {method: 'POST', body: formData})
      .then(response => response.json())
      .then((responseJson) => {
        // console.log("URL = " + responseJson.url)
        //  To do, add URL and ask user position to place the image
        local.information.avatarSrc = responseJson.url
        console.log(`info.avatar = ${local.information.avatarSrc}`)
      })
    }
    ev.preventDefault()
  }

  return <form onSubmit={handleSubmit}>
    Name: <input type="text" {...name} /> <br />
    Email: <input type="text" {...email} /> <br />
    Avatar: <input type="file" ref={avatarSrc} onChange={(ev) => {
      setFile(ev.target.files?.item(0))
    }} /> <br />
    <input type="submit" value=" Submit " />
  </form>
}


const localParticipantPlugin: PluginBase<Props> = {
  type: LOCAL_PARTICIPANT_CONFIG,
  ConfigurationRenderer: LocalParticipantConfig,
}

registerPlugin(localParticipantPlugin)
