import { Button, ButtonProps, DialogTitle } from '@material-ui/core'
import Box from '@material-ui/core/Box'
import TextField from '@material-ui/core/TextField'
import { conference } from '@models/conference'
import roomInfo from '@stores/RoomInfo'
import {Observer} from 'mobx-react-lite'
import React from 'react'

export interface EditRoomFormProps{
  close?: () => void,
}
export const EditRoomForm: React.FC<EditRoomFormProps> = (props: EditRoomFormProps) => {
  const [adminEmail, setAdminEmail] = React.useState('')
  const [loginSuffix, setLoginSuffix] = React.useState('')

  const btnArgs:ButtonProps = {
    variant:"contained",
    style:{textTransform:'none'},
    color: 'primary',
  }

  return <Observer>{()=>{
    return  <>
    <DialogTitle>
      Edit room admin and login
    </DialogTitle>
    <Box m={2}>
      Login: &nbsp;
      <TextField label="Suffix" type="text" style={{marginTop:-12}}
              value={loginSuffix} onChange={(ev)=>{setLoginSuffix(ev.currentTarget.value)}} /> &nbsp;
      <Button {...btnArgs} onClick = { () => {
        conference.addLoginSuffix(loginSuffix).then(info => roomInfo.loginInfo = info)
      }}
      >add</Button>&nbsp;
      <Button {...btnArgs} onClick = { () => {
        conference.removeLoginSuffix(loginSuffix).then(info => roomInfo.loginInfo = info)
      }}
      >remove</Button> &nbsp;
    </Box>
    <Box m={2}>
      Admin: &nbsp;
      <TextField label="Email" type="text" style={{marginTop:-12}}
              value={adminEmail} onChange={(ev)=>{setAdminEmail(ev.currentTarget.value)}} /> &nbsp;
      <Button {...btnArgs} onClick = { () => {
        conference.addAdmin(adminEmail).then(info => roomInfo.loginInfo = info)
      }}
      >add</Button>&nbsp;
      <Button {...btnArgs} onClick = { () => {
        conference.removeAdmin(adminEmail).then(info => {
          roomInfo.loginInfo = info
        })
      }}
      >remove</Button> &nbsp;
    </Box>
    <Box m={2}>
      <Button {...btnArgs} onClick = { () => {
          props.close && props.close()
        }}
        >Close</Button> &nbsp;
    </Box>
    <Box m={2}>
      Login: { roomInfo.loginInfo?.emailSuffixes?.reduce((prev, cur)=>`${prev} ${cur}`, "") }
    </Box>
    <Box m={2}>
      Admin: { roomInfo.loginInfo?.admins?.reduce((prev, cur)=>`${prev} ${cur}`, "") }
    </Box>
    </>}
  }</Observer>
}
