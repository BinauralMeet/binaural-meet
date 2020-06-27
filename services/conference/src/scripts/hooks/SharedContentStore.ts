import {SharedContent} from '@stores/sharedContents/SharedContent'
import {createContext, useContext} from 'react'

export const StoreContext = createContext<SharedContent>({} as SharedContent)
export const StoreProvider = StoreContext.Provider
export const useStore = () => useContext(StoreContext)
