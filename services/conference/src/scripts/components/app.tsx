import {StoreProvider as AppLevelProvider, useStore} from '@hooks/AppLevelStore'
import {StoreProvider as ParticipantsProvider} from '@hooks/ParticipantsStore'
import {makeStyles} from '@material-ui/core/styles'
import {default as appLevelStore} from '@stores/AppLevel'
import participantsStore from '@stores/Participants'
import React from 'react'
import {Footer} from './footer/footer'
import {Map} from './map/map'

const useStyles = makeStyles({
  map: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: '100%',
    width: '100%',
    overflow: 'hidden',
  },
})

export const App: React.FC<{}> = () => {
  const classes = useStyles()

  return (
    <AppLevelProvider value={appLevelStore}>
    <ParticipantsProvider value={participantsStore}>
    <div className={classes.map}>
      <Map />
      <Footer />
    </div>
    </ParticipantsProvider>)
    </AppLevelProvider>
  )
}
App.displayName = 'App'
