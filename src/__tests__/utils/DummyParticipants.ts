import {ConnectionStates, ConnectionStatesType} from '@models/api'
import {IConnectionInfo} from '@stores/ConnectionInfo'
import {Store} from '@stores/utils'
import {action, observable} from 'mobx'
import {createContext, useContext} from 'react'

export class DummyConnectionStore implements Store<IConnectionInfo> {
  apiVersion: string
  @observable
  state: ConnectionStatesType

  constructor() {
    this.apiVersion = '0.0.1'
    this.state = ConnectionStates.DISCONNECTED
  }

  @action
  changeState(newState: ConnectionStatesType) {
    this.state = newState
  }
}

export const StoreContext = createContext<DummyConnectionStore>({} as DummyConnectionStore)
export const StoreProvider = StoreContext.Provider
export const useStore = () => useContext(StoreContext)

export const dummyConnectionStore = new DummyConnectionStore()
// const dummyConnection = new Connection(dummyConnectionStore, 'DummyConnection')

// Working Draft


// export {dummyConnection}
