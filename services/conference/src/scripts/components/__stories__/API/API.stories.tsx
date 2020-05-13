import {connection as connectionInstance} from '@models/api'

import {StoreProvider as ConnectionInfoProvider, useStore} from '@hooks/ConnectionInfoStore'
import store from '@stores/ConnectionInfo'
import React from 'react'

import Button from '@material-ui/core/Button'
import ButtonGroup from '@material-ui/core/ButtonGroup'
import {useObserver} from 'mobx-react-lite'
// import { withInfo } from "@storybook/addon-info";

export default {
  title: 'Connection',
  // decorators: [withInfo],
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
    <ConnectionInfoProvider value={store}>
      {/* <DummyProvider value={storeDummy}> */}
        <Controller />
        {displayElements}
        {/* <LocalVideo /> */}
      {/* </DummyProvider> */}
    </ConnectionInfoProvider>
  )
}
