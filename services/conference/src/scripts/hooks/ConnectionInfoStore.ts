import { ConnectionInfo } from '@stores/ConnectionInfo'
import { createContext, useContext } from 'react'

export const StoreContext = createContext<ConnectionInfo>({} as ConnectionInfo)
export const StoreProvider = StoreContext.Provider
export const useStore = () => useContext(StoreContext)
