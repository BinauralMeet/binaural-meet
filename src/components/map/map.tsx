import {Base} from '@components/map/Base'
import {ParticipantsLayer} from '@components/map/ParticipantsLayer'
import {ShareLayer} from '@components/map/ShareLayer'
import {MapProps} from '@components/utils'
//import {useStore as useParticipantsStore} from '@hooks/ParticipantsStore'
//import {useStore as useContentsStore} from '@hooks/SharedContentsStore'
//import {useObserver} from 'mobx-react-lite'
import React from 'react'
import {BackgroundLayer} from './BackgroundLayer'


export const Map: React.FC<MapProps> = (props) => {

  return (
    <Base {...props}>
      <BackgroundLayer {...props}/>
      <ShareLayer {...props} />
      <ParticipantsLayer {...props}/>
    </Base>
  )
}
Map.displayName = 'Map'
