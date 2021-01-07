import Button from '@material-ui/core/Button'
import ButtonGroup from '@material-ui/core/ButtonGroup'
import {connection as connectionInstance} from '@models/api'
import React from 'react'
// import { withInfo } from "@storybook/addon-info";

export default {
  title: 'Connection',
  // decorators: [withInfo],
}

const Controller: React.FC<{}> = () => {
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
    </div>
  )
}
