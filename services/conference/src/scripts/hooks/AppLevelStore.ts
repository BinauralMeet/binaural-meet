import {AppLevel} from '@stores/AppLevel'
import {createContext, useContext} from 'react'

export const StoreContext = createContext<AppLevel>({} as AppLevel)
export const StoreProvider = StoreContext.Provider
export const useStore = () => useContext(StoreContext)
