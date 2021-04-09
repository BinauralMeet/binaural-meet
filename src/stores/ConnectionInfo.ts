import {ConnectionStates, ConnectionStatesType} from '@models/api'
import {action, makeObservable, observable} from 'mobx'
import {Store} from './utils'

export interface IConnectionInfo {
  apiVersion: string,
  state: ConnectionStatesType,
}

export class ConnectionInfo implements Store<IConnectionInfo> {
  apiVersion: string
  @observable
  state: ConnectionStatesType

  constructor() {
    makeObservable(this)
    this.apiVersion = 'INVALID'
    this.state = ConnectionStates.DISCONNECTED
  }

  @action
    changeState(newState: ConnectionStatesType) {
    this.state = newState
  }
}

export default new ConnectionInfo()
