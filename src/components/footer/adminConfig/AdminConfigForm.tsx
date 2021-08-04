import Button from '@material-ui/core/Button'
import {connection} from '@models/api'
import { MessageType } from '@models/api/ConferenceSync'
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
      connection.conference.sendMessage(MessageType.MUTE_VIDEO, '', true)
    }}> Mute all videos </Button>
    <Button onClick={() => {
      connection.conference.sendMessage(MessageType.MUTE_VIDEO, '', false)
    }}> Show all videos </Button>
    <br />
    <Button onClick={() => {
      connection.conference.sendMessage(MessageType.MUTE_AUDIO, '', true)
    }}> Mute all mics </Button>
    <Button onClick={() => {
      connection.conference.sendMessage(MessageType.MUTE_VIDEO, '', false)
    }}> Switch on all mics </Button>
    <br />
    <Button onClick={() => {
      connection.conference.sendMessage(MessageType.RELOAD_BROWSER, '', '')
    }}> Reload </Button>
    </>
}
