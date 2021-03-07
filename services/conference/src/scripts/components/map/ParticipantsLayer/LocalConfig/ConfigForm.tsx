import {useStore} from '@hooks/ParticipantsStore'
import DialogContent from '@material-ui/core/DialogContent'
import DialogTitle from '@material-ui/core/DialogTitle'
import {uploadToGyazo} from '@models/api/Gyazo'
import {useTranslation} from '@models/locales'
import {defaultInformation} from '@models/Participant'
import {isSmartphone} from '@models/utils/utils'
import React, {useState} from 'react'

function useInput<T>(initialValue:T) {
  const [value, set] = useState(initialValue)

  function handler(e:React.ChangeEvent<HTMLInputElement>) {
    (set as any)(e.target.value)
  }

  return {value, set, args: {value, onChange: handler}}
}
export interface ConfigFormProps{
  close?: () => void,
}

export const ConfigForm: React.FC<ConfigFormProps> = (props: ConfigFormProps) => {
  const [submitType, setSubmitType] = useState('')
  const participants = useStore()
  const local = participants.local
  const name = useInput(local.information.name)
  const email = useInput(local.information.email)
  const [file, setFile] = useState<File|null>()
  const {t} = useTranslation()

  function submitHandler(ev: React.FormEvent) {
    ev.preventDefault()
    if (submitType === 'clearAvatarSrc') {
      setFile(null)
      local.information.avatarSrc = undefined

      return
    }

    if (props.close) { props.close() }
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
      uploadToGyazo(file).then((url) => {
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

  const iStyle = {fontSize: isSmartphone() ? '2.5rem' : '1rem'}
  const form = <form key="information" onSubmit = {submitHandler}
    style={{lineHeight:'2em', fontSize: isSmartphone() ? '2.5em' : '1em'}}>
    {t('asName')}: <input style={iStyle} type="text" {...name.args} /> <br />
    {t('asImageFile')}: &nbsp;
    {local.information.avatarSrc ?
      <> <img src={local.information.avatarSrc} style={{height:'1.5em', verticalAlign:'middle'}} />
      <input style={iStyle} type="submit"
        onClick={() => setSubmitType('clearAvatarSrc')} value="✕" /> &nbsp; </>
       : undefined}
    <input style={iStyle} type="file" onChange={(ev) => {
      setFile(ev.target.files?.item(0))
    }} /> <br />
    {t('asEmail')}: <input style={iStyle} type="text" {...email.args} /> <br />
    <input style={iStyle} type="submit" onClick={() => setSubmitType('local')} value={t('Save')} /> &nbsp;
    <input style={iStyle} type="submit" onClick={() => setSubmitType('clear')} value={t('Clear')} />&nbsp;
    <input style={iStyle} type="submit" onClick={() => setSubmitType('cancel')} value={t('Cancel')} />
  </form>

  return <>
    <DialogTitle>
      <span  style={{fontSize: isSmartphone() ? '2.5em' : '1em'}}>
        {t('asTitle')}
      </span>
    </DialogTitle>
    <DialogContent>
      {form}
      <br />
    </DialogContent>
  </>
}
