import {StoreProvider} from '@hooks/ParticipantsStore'
import {makeStyles} from '@material-ui/core/styles'
import participantsStore from '@stores/Participants'
import React from 'react'
import {Map} from './map/map'
import {Footer} from './footer/footer'

(global as any).ps = participantsStore;

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
    <StoreProvider value={participantsStore}>
      <div className={classes.map}>
        <Map />
        {/* <Footer />  */}
      </div>
    </StoreProvider>
  )
}
App.displayName = 'App'
