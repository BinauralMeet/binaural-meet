import {SharedObjects} from '@stores/SharedObjects'
import {createContext, useContext} from 'react'

export const StoreContext = createContext<SharedObjects>({} as SharedObjects)
export const StoreProvider = StoreContext.Provider
export const useStore = () => useContext(StoreContext)
