import {Base} from '@components/map/Base'
import {ParticipantsLayer} from '@components/map/ParticipantsLayer'
import {ShareLayer} from '@components/map/ShareLayer'
import {BaseProps} from '@components/utils'
import React from 'react'
import {BackgroundLayer} from './BackgroundLayer'
import {StoreProvider as ParticipantsProvider} from '@hooks/ParticipantsStore'
import participantsStore from '@stores/participants/Participants'

export const Map: React.FC<BaseProps> = (props) => {
  return (
    <Base {...props}>
      <BackgroundLayer />
      <ShareLayer />
      <ParticipantsLayer />
    </Base>
  )
}
Map.displayName = 'Map'

