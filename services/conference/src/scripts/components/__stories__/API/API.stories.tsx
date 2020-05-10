import {connection as connectionInstance} from '@models/api'

import {StoreProvider, useStore} from '@hooks/ConnectionInfoStore'
import store from '@stores/ConnectionInfo'
import React from 'react'

import Button from '@material-ui/core/Button'
import ButtonGroup from '@material-ui/core/ButtonGroup'
import {useObserver} from 'mobx-react-lite'

export default {
  title: 'Connection',
}

const Controller: React.FC<{}> = () => {
  const connectionInfo = useStore()

  const callbackConnect = () => {
    connectionInstance.init()
  }

  const callbackDisconnect = () => {
    connectionInstance.disconnect()
  }

  return (
    <div>
      <ButtonGroup>
        <Button onClick={callbackConnect}>Connect to server</Button>
        <Button onClick={callbackDisconnect}>Disconnect from server</Button>
      </ButtonGroup>
      <h1>{connectionInfo.state}</h1>
    </div>
  )
}


export const connection: React.FC<{}> = () => {
  // const connectionInfo = useStore();
  const displayElements = useObserver(
    () => {
      return (
        <div>
          <div>Connection State: {store.state}</div>
          <div>Connection.Version: {store.apiVersion}</div>
        </div>
      )
    },
  )

  return (
    <StoreProvider value={store}>
      <Controller />
      {displayElements}
    </StoreProvider>
  )
}
