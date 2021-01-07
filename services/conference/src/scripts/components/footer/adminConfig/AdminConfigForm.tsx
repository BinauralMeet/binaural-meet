import Button from '@material-ui/core/Button'
import {Connection} from '@models/api/Connection'
import {ConnectionForContent} from '@models/api/ConnectionForScreenContent'
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
      const connection = new ConnectionForContent
      connection.init().then(() => {
        console.log('ConnectionForContent connected.')
      })
    }}> Test </Button>
    </>
}
