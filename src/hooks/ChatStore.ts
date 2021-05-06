import {Chat} from '@stores/Chat'
import {createContext, useContext} from 'react'

export const StoreContext = createContext<Chat>({} as Chat)
export const StoreProvider = StoreContext.Provider
export const useStore = () => useContext(StoreContext)
