import {MapData} from '@stores/Map'
import {createContext, useContext} from 'react'

export const StoreContext = createContext<MapData>({} as MapData)
export const StoreProvider = StoreContext.Provider
export const useStore = () => useContext(StoreContext)
