import {Base} from '@components/map/Base'
import {ShareLayer} from '@components/map/ShareLayer'
import {ParticipantsLayer} from '@components/map/ParticipantsLayer'
import {BaseProps} from '@components/utils'
import React from 'react'
import {BackgroundLayer} from './BackgroundLayer'

export const Map: React.FC<BaseProps> = (props) => {
  return <Base {...props}>
    <BackgroundLayer />
    <ShareLayer />
    <ParticipantsLayer />
  </Base>
}
Map.displayName = 'Map'
