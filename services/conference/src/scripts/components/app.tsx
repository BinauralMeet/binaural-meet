import {StoreProvider as ParticipantsProvider} from '@hooks/ParticipantsStore'
import {StoreProvider as ContentsProvider} from '@hooks/SharedContentsStore'
import {makeStyles} from '@material-ui/core/styles'
import participantsStore from '@stores/participants/Participants'
import sharedContentsStore from '@stores/sharedContents/SharedContents'
import React from 'react'
import {Footer} from './footer/footer'
import {MainScreen} from './map/MainScreen'
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
    <ParticipantsProvider value={participantsStore}>
    <ContentsProvider value={sharedContentsStore}>
      <div className={classes.map}>
        <MainScreen />
        <Map />
        <Footer />
      </div>
    </ContentsProvider>
    </ParticipantsProvider>
  )
}
App.displayName = 'App'
