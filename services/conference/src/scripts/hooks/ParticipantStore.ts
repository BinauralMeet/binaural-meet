import {Participant} from '@stores/Participant'
import {createContext, useContext} from 'react'

export const StoreContext = createContext<Participant>({} as Participant)
export const StoreProvider = StoreContext.Provider
export const useStore = () => useContext(StoreContext)
