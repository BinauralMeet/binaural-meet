import {ConnectionStates} from '@models/api'
import {action, observable} from 'mobx'
import {Store} from './utils'

export interface IConnectionInfo {
  apiVersion: string,
  state: ConnectionStates,
}

export class ConnectionInfo implements Store<IConnectionInfo> {
  apiVersion: string
  @observable
  state: ConnectionStates

  constructor() {
    this.apiVersion = 'INVALID'
    this.state = ConnectionStates.Disconnected
  }

  @action
    changeState(newState: ConnectionStates) {
    this.state = newState
  }
}

export default new ConnectionInfo()
