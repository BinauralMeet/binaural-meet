import {Base} from '@components/map/Base'
import {ParticipantLayer} from '@components/map/Participant'
import {ShareLayer} from '@components/map/Share'
//import {useStore as useParticipantsStore} from '@hooks/ParticipantsStore'
//import {useStore as useContentsStore} from '@hooks/SharedContentsStore'
//import {useObserver} from 'mobx-react-lite'
import React from 'react'
import {BackgroundLayer} from './Background'

export interface MapProps{
  transparent: boolean
}

export const Map: React.FC<MapProps> = (props) => {

  return (
    <Base {...props}>
      <BackgroundLayer {...props}/>
      <ShareLayer {...props} />
      <ParticipantLayer {...props}/>
    </Base>
  )
}
Map.displayName = 'Map'
