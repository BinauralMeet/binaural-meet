import {Stores} from '@components/utils'
import Box from '@material-ui/core/Box'
import TextField from '@material-ui/core/TextField'
import settings from '@stores/Settings'
import {Observer} from 'mobx-react-lite'
import React from 'react'

export interface PositionServerFormProps{
  close?: () => void,
  stores: Stores,
}
export const PositionServerForm: React.FC<PositionServerFormProps> = (props: PositionServerFormProps) => {
  if (!settings.lpsUrl) settings.load()
  const [lpsId, setLpsId] = React.useState(settings.lpsId)
  const [lpsUrl, setLpsUrl] = React.useState(settings.lpsUrl)
  function onKeyPress(ev:React.KeyboardEvent){
    if (ev.key === 'Enter') {
      settings.lpsId = lpsId
      settings.lpsUrl = lpsUrl
      settings.save()
      props.close && props.close()
    }
  }

  return <Observer>{()=>{
    return  <><Box m={2}>
    Local Positioning System
    </Box><Box m={2}>
    <TextField autoFocus label="Id" value={lpsId} onChange={(ev)=>{ setLpsId(ev.currentTarget.value) }}
    onKeyPress={(ev)=>onKeyPress(ev)}/>
    </Box><Box m={2}>
    <TextField label="URL" value={lpsUrl} onChange={(ev)=>{ setLpsUrl(ev.currentTarget.value) }}
    onKeyPress={(ev)=>onKeyPress(ev)}/>
    </Box></>}
  }</Observer>
}
