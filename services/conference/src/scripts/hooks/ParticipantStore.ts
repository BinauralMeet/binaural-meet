import {ParticipantBase} from '@stores/participants/ParticipantBase'
import {createContext, useContext} from 'react'

export const StoreContext = createContext<ParticipantBase>({} as ParticipantBase)
export const StoreProvider = StoreContext.Provider
export const useStore = () => useContext(StoreContext)
