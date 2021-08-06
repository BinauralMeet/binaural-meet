import Box from '@material-ui/core/Box'
import Button from '@material-ui/core/Button'
import TextField from '@material-ui/core/TextField'
import {connection} from '@models/api'
import {MessageType} from '@models/api/ConferenceSync'
import roomInfo from '@stores/RoomInfo'
import contents from '@stores/sharedContents/SharedContents'
import { Observer } from 'mobx-react-lite'
import React from 'react'
import {RemoteTrackLimitControl} from './RemoteTrackLimitControl'

export interface AdminConfigFormProps{
  close?: () => void,
}

function onKeyPress(ev:React.KeyboardEvent){
  if (ev.key === 'Enter') {
    let pass = connection.conference.roomInfoServer?.roomProps.get('password')
    roomInfo.passMatched = roomInfo?.password === pass
  }
}
function btnColor(){
  return roomInfo.passMatched ? 'primary' : 'default'
}
export const AdminConfigForm: React.FC<AdminConfigFormProps> = (props: AdminConfigFormProps) => {
  return <Observer>{()=><Box m={2}>
    <Box mt={2} mb={2}>
      <TextField label="Admin password" type="password"
        value={roomInfo?.password} onChange={(ev)=>{ roomInfo.password=ev.currentTarget.value}}
        onKeyPress={onKeyPress}/>
      &emsp;
      <Button variant="contained" color="primary" onClick={() => {
        let pass = connection.conference.roomInfoServer?.roomProps.get('password')
        if (!pass){ pass = '' }
        roomInfo.passMatched = roomInfo?.password === pass
      }}> Check </Button>&emsp;
      {roomInfo.passMatched ? 'OK': 'Not matched'}
    </Box>
    <Box mt={2} mb={2}>
      <TextField label="New password to update" type="text"
        value={roomInfo?.newPassword} onChange={(ev)=>{roomInfo.newPassword=ev.currentTarget.value}}
      />&emsp;
      <Button variant="contained" color={btnColor()} disabled={!roomInfo.passMatched} onClick={() => {
        if (roomInfo.passMatched){
          connection.conference.setRoomProp('password', roomInfo.newPassword)
        }
      }}> Update password </Button>&emsp;
    </Box>
    <Box m={2} mt={3} >
      <RemoteTrackLimitControl key="remotelimitcontrol" />
    </Box>
    <Box mt={2}>
    <Button variant="contained" color={btnColor()} disabled={!roomInfo.passMatched} onClick={() => {
      if (roomInfo.passMatched) { connection.conference.sendMessage(MessageType.MUTE_VIDEO, '', true) }
    }}> Mute all videos </Button> &nbsp;
    <Button variant="contained" color={btnColor()} disabled={!roomInfo.passMatched} onClick={() => {
      if (roomInfo.passMatched) { connection.conference.sendMessage(MessageType.MUTE_VIDEO, '', false) }
    }}> Show all videos </Button>&emsp;
    <Button variant="contained" color={btnColor()} disabled={!roomInfo.passMatched} onClick={() => {
      if (roomInfo.passMatched) { connection.conference.sendMessage(MessageType.MUTE_AUDIO, '', true) }
    }}> Mute all mics </Button>&nbsp;
    <Button variant="contained" color={btnColor()} disabled={!roomInfo.passMatched} onClick={() => {
      if (roomInfo.passMatched) { connection.conference.sendMessage(MessageType.MUTE_VIDEO, '', false) }
    }}> Switch on all mics </Button>
    </Box>
    <Box mt={2}>
    <Button variant="contained" color={btnColor()} disabled={!roomInfo.passMatched} onClick={() => {
      if (roomInfo.passMatched) { connection.conference.sendMessage(MessageType.RELOAD_BROWSER, '', '') }
    }}> Reload </Button>&emsp;
    <Button variant="contained" color={btnColor()} disabled={!roomInfo.passMatched} onClick={() => {
      if (roomInfo.passMatched) {
        contents.all.forEach(c => {
          contents.removeByLocal(c.id)
        })
      }
    }}> Clear All Contents </Button>
    </Box>
    </Box>}</Observer>
}
