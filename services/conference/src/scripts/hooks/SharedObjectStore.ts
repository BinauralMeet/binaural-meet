import {SharedObject} from '@stores/SharedObject'
import {createContext, useContext} from 'react'

export const StoreContext = createContext<SharedObject>({} as SharedObject)
export const StoreProvider = StoreContext.Provider
export const useStore = () => useContext(StoreContext)
