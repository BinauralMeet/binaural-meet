import Button from '@material-ui/core/Button'
import {Connection} from '@models/api/Connection'
import {urlParameters} from '@models/url'
import React from 'react'
import {RemoteTrackLimitControl} from './RemoteTrackLimitControl'

export interface AdminConfigFormProps{
  close?: () => void,
}

export const AdminConfigForm: React.FC<AdminConfigFormProps> = (props: AdminConfigFormProps) => {
  return <>
    <br />
    <RemoteTrackLimitControl key="remotelimitcontrol" />
    <br />
    <Button onClick={() => {
      const connection = new Connection
      const conferenceName = urlParameters.name || 'haselabtest'

      connection.init().then(
        () => connection.joinConference(conferenceName),
      )
    }}> Test </Button>
    </>
}
