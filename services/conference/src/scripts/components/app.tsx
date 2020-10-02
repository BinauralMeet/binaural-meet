import {StoreProvider as MapProvider} from '@hooks/MapStore'
import {StoreProvider as ParticipantsProvider} from '@hooks/ParticipantsStore'
import {StoreProvider as ContentsProvider} from '@hooks/SharedContentsStore'
import {makeStyles} from '@material-ui/core/styles'
import mapStore from '@stores/MapObject/MapData'
import participantsStore from '@stores/participants/Participants'
import sharedContentsStore from '@stores/sharedContents/SharedContents'
import React from 'react'
import SplitPane from 'react-split-pane'
import {Footer} from './footer/footer'
import {LeftBar} from './leftBar/LeftBar'
import {MainScreen} from './map/MainScreen'
import {Map} from './map/map'

const useStyles = makeStyles({
  back:{
    position: 'absolute',
    width: '100%',
    height: '100%',
    top: 0,
    left: 0,
    backgroundColor: 'lightgray',
  },
  fill:{
    position: 'absolute',
    width: '100%',
    height: '100%',
    top: 0,
    left: 0,
  },
  resizer: {
    background: '#000',
    opacity: 0.2,
    zIndex: 1,
    boxSizing: 'border-box',
    backgroundClip: 'padding-box',
    width: 11,
    margin: '0 -10px 0 0',
    borderLeft: '1px solid black',
    borderRight: '10px solid rgba(255, 255, 255, 0)',
    cursor: 'col-resize',
  },
})

export const App: React.FC<{}> = () => {
  const classes = useStyles()
  const defaultLeftBarWidth = 100

  return (
    <ParticipantsProvider value={participantsStore}>
    <ContentsProvider value={sharedContentsStore}>
    <MapProvider value={mapStore}>
      <div className={classes.back}>
        <SplitPane className={classes.fill} split="vertical" resizerClassName={classes.resizer}
          minSize={0} defaultSize={defaultLeftBarWidth}>
          <LeftBar />
          <div >
            <MainScreen />
            <Map />
            <Footer />
          </div>
        </SplitPane>
      </div>
    </MapProvider>
    </ContentsProvider>
    </ParticipantsProvider >
  )
}
App.displayName = 'App'
