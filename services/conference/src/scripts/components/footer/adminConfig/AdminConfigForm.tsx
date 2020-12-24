import React from 'react'
import {RemoteTrackLimitControl} from './RemoteTrackLimitControl'

export interface AdminConfigFormProps{
  close?: () => void,
}

export const AdminConfigForm: React.FC<AdminConfigFormProps> = (props: AdminConfigFormProps) => {
  return <>
    <br />
    <RemoteTrackLimitControl key="remotelimitcontrol" />
  </>
}
