import {Stores} from '@components/utils'
import Box from '@material-ui/core/Box'
import TextField from '@material-ui/core/TextField'
import {conference} from '@models/conference'
import {Observer} from 'mobx-react-lite'
import React from 'react'

export interface PositionServerFormProps{
  close?: () => void,
  stores: Stores,
}
export const PositionServerForm: React.FC<PositionServerFormProps> = (props: PositionServerFormProps) => {
  const {roomInfo} = props.stores
  const initialValue = roomInfo.roomProps.get('positionServer')
  const [positionServer, setPositionServer] = React.useState(initialValue ? initialValue : '')
  function onKeyPress(ev:React.KeyboardEvent){
    if (ev.key === 'Enter') {
      conference.dataConnection.setRoomProp('positionServer', positionServer)
      props.close && props.close()
    }
  }

  return <Observer>{()=>{
    return  <Box m={2}>
    <TextField autoFocus label="Position server URL" value={positionServer} onChange={(ev)=>{ setPositionServer(ev.currentTarget.value) }}
    onKeyPress={(ev)=>onKeyPress(ev)}/>
    </Box>}
  }</Observer>
}
