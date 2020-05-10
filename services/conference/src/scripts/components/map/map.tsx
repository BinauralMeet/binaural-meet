import {Base} from '@components/map/Base'
import {ParticipantsLayer} from '@components/map/ParticipantsLayer'
import {BaseProps} from '@components/utils'
import React from 'react'

export const Map: React.FC<BaseProps> = (props) => {
  return <Base {...props}>
    <ParticipantsLayer />
  </Base>
}
