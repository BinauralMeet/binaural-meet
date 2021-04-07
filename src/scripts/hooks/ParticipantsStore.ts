import {Participants} from '@stores/participants/Participants'
import {createContext, useContext} from 'react'

export const StoreContext = createContext<Participants>({} as Participants)
export const StoreProvider = StoreContext.Provider
export const useStore = () => useContext(StoreContext)
