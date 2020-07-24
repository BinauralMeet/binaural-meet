import {Base} from '@components/map/Base'
import {ParticipantsLayer} from '@components/map/ParticipantsLayer'
import {ShareLayer} from '@components/map/ShareLayer'
import {BaseProps} from '@components/utils'
import {useStore as useContentsStore} from '@hooks/SharedContentsStore'
import {useObserver} from 'mobx-react-lite'
import React from 'react'
import {BackgroundLayer} from './BackgroundLayer'


export const Map: React.FC<BaseProps> = (props) => {
  const store = useContentsStore()
  const stream = useObserver(() => store.mainStream)

  return (
    <Base {...props}>
      {<BackgroundLayer isTransparnet={stream !== undefined} />}
      {stream ? undefined : <ShareLayer />}
      <ParticipantsLayer />
    </Base>
  )
}
Map.displayName = 'Map'

