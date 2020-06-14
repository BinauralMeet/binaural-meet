import {default as sharedContents, SharedContents} from '@stores/SharedContents'
import {createContext, useContext} from 'react'

export const StoreContext = createContext<SharedContents>(sharedContents)
export const StoreProvider = StoreContext.Provider
export const useStore = () => useContext(StoreContext)
