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
    roomInfo.passMatched = roomInfo?.password === (pass ? pass : '')
  }
}
function btnColor(){
  return roomInfo.passMatched ? 'primary' : 'default'
}
export const AdminConfigForm: React.FC<AdminConfigFormProps> = (props: AdminConfigFormProps) => {
  const [clearName, setClearName] = React.useState('')

  return <Observer>{()=><Box m={2}>
    <Box mt={2} mb={2}>
      <TextField autoFocus label="Admin password" type="password" style={{marginTop:-12}}
        value={roomInfo?.password} onChange={(ev)=>{ roomInfo.password=ev.currentTarget.value}}
        onKeyPress={onKeyPress}/>
      &emsp;
      <Button variant="contained" color="primary" style={{textTransform:'none'}} onClick={() => {
        let pass = connection.conference.roomInfoServer?.roomProps.get('password')
        if (!pass){ pass = '' }
        roomInfo.passMatched = roomInfo?.password === pass
      }}> Check </Button>&emsp;
      {roomInfo.passMatched ? 'OK': 'Not matched'}
    </Box>
    <Box mt={2} mb={2}>
      <TextField label="New password to update" type="text" style={{marginTop:-12}}
        value={roomInfo?.newPassword} onChange={(ev)=>{roomInfo.newPassword=ev.currentTarget.value}}
      />&emsp;
      <Button variant="contained" color={btnColor()} disabled={!roomInfo.passMatched} style={{textTransform:'none'}}
        onClick={() => {
          if (roomInfo.passMatched){
            connection.conference.setRoomProp('password', roomInfo.newPassword)
          }
        }}> Update password </Button>&emsp;
    </Box>
    <Box m={2} mt={3} >
      <RemoteTrackLimitControl key="remotelimitcontrol" />
    </Box>
    <Box mt={2}>
      <Button variant="contained" color={btnColor()} style={{textTransform:'none'}}
        disabled={!roomInfo.passMatched} onClick={() => {
        if (roomInfo.passMatched) { connection.conference.sendMessage(MessageType.MUTE_VIDEO, '', true) }
      }}> Mute all videos </Button> &nbsp;
      <Button variant="contained" color={btnColor()} style={{textTransform:'none'}}
        disabled={!roomInfo.passMatched} onClick={() => {
        if (roomInfo.passMatched) { connection.conference.sendMessage(MessageType.MUTE_VIDEO, '', false) }
      }}> Show all videos </Button>&emsp;
      <Button variant="contained" color={btnColor()} style={{textTransform:'none'}}
        disabled={!roomInfo.passMatched} onClick={() => {
        if (roomInfo.passMatched) { connection.conference.sendMessage(MessageType.MUTE_AUDIO, '', true) }
      }}> Mute all mics </Button>&nbsp;
      <Button variant="contained" color={btnColor()} style={{textTransform:'none'}}
        disabled={!roomInfo.passMatched} onClick={() => {
        if (roomInfo.passMatched) { connection.conference.sendMessage(MessageType.MUTE_VIDEO, '', false) }
      }}> Switch on all mics </Button>
    </Box>
    <Box mt={2}>
      <Button variant="contained" color={btnColor()} style={{textTransform:'none'}}
        disabled={!roomInfo.passMatched} onClick={() => {
        if (roomInfo.passMatched) {
          contents.all.forEach(c => {
            contents.removeByLocal(c.id)
          })
        }
      }}> Remove all Contents </Button>&emsp;
      <Button variant="contained" color={btnColor()} style={{textTransform:'none'}}
        disabled={!roomInfo.passMatched} onClick={() => {
          if (roomInfo.passMatched){
            contents.all.filter(c => c.ownerName === clearName).forEach(c => contents.removeByLocal(c.id))
          }
      }}> Clear contents by user name </Button> &thinsp;
      <TextField label="name" type="text" style={{marginTop:-12}}
          value={clearName} onChange={(ev)=>{setClearName(ev.currentTarget.value)}} />
    </Box>
    <Box mt={2}>
      <Button variant="contained" color={btnColor()} style={{textTransform:'none'}}
        disabled={!roomInfo.passMatched} onClick={() => {
        if (roomInfo.passMatched) { connection.conference.sendMessage(MessageType.RELOAD_BROWSER, '', '') }
      }}> Reload </Button>&emsp;
    </Box>
  </Box>}</Observer>
}
