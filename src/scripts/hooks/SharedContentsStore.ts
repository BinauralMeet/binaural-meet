import {SharedContents} from '@stores/sharedContents/SharedContents'
import {createContext, useContext} from 'react'

export const StoreContext = createContext<SharedContents>({} as SharedContents)
export const StoreProvider = StoreContext.Provider
export const useStore = () => useContext(StoreContext)
