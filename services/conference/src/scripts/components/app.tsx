import {StoreProvider as MapProvider} from '@hooks/MapStore'
import {StoreProvider as ParticipantsProvider} from '@hooks/ParticipantsStore'
import {StoreProvider as ContentsProvider} from '@hooks/SharedContentsStore'
import mapStore from '@stores/MapObject/MapData'
import participantsStore from '@stores/participants/Participants'
import sharedContentsStore from '@stores/sharedContents/SharedContents'
import React from 'react'
import SplitPane from 'react-split-pane'
import {Footer} from './footer/footer'
import {LeftBar} from './leftBar/LeftBar'
import {MainScreen} from './map/MainScreen'
import {Map} from './map/map'
import {styleCommon, styleForSplit} from './utils/styles'


export const App: React.FC<{}> = () => {
  const clsSplit = styleForSplit()
  const classes = styleCommon()
  const defaultLeftBarWidth = 100

  return (
    <ParticipantsProvider value={participantsStore}>
    <ContentsProvider value={sharedContentsStore}>
    <MapProvider value={mapStore}>
      <div className={classes.back}>
        <SplitPane className={classes.fill} split="vertical" resizerClassName={clsSplit.resizerVertical}
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
