import {useStore} from '@hooks/SharedObjectStore'
//import {useObserver} from 'mobx-react-lite'
import React from 'react'

export const ShareLayer: React.FC<{}> = () => {
  const store = useStore()
  return <div>
  </div>
}
ShareLayer.displayName = 'ShareLayer'
