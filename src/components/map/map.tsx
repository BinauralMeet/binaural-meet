import {Base} from '@components/map/Base'
import {ParticipantsLayer} from '@components/map/ParticipantsLayer'
import {ShareLayer} from '@components/map/ShareLayer'
import {BaseProps} from '@components/utils'
//import {useStore as useParticipantsStore} from '@hooks/ParticipantsStore'
//import {useStore as useContentsStore} from '@hooks/SharedContentsStore'
//import {useObserver} from 'mobx-react-lite'
import React from 'react'
import {BackgroundLayer} from './BackgroundLayer'


export const Map: React.FC<BaseProps> = (props) => {

  return (
    <Base {...props}>
      <BackgroundLayer transparent={props.transparent} />
      <ShareLayer {...props} />
      <ParticipantsLayer />
    </Base>
  )
}
Map.displayName = 'Map'
