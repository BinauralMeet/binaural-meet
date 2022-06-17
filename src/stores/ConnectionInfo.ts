import {action, makeObservable, observable} from 'mobx'
import {Store} from './utils'

export type ConnectionStates = 'disconnected' | 'connecting' | 'connected'

export interface IConnectionInfo {
  apiVersion: string,
  state: ConnectionStates,
}

export class ConnectionInfo implements Store<IConnectionInfo> {
  apiVersion: string
  @observable
  state: ConnectionStates

  constructor() {
    makeObservable(this)
    this.apiVersion = 'INVALID'
    this.state = 'disconnected'
  }

  @action
    changeState(newState: ConnectionStates) {
    this.state = newState
  }
}

export default new ConnectionInfo()
