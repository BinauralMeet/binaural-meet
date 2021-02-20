import {StoreProvider as MapProvider} from '@hooks/MapStore'
import {StoreProvider as ParticipantsProvider} from '@hooks/ParticipantsStore'
import {StoreProvider as ContentsProvider} from '@hooks/SharedContentsStore'
import mapStore from '@stores/Map'
import participantsStore from '@stores/participants/Participants'
import sharedContentsStore from '@stores/sharedContents/SharedContents'
import {useObserver} from 'mobx-react-lite'
import React, {Fragment} from 'react'
import SplitPane from 'react-split-pane'
import {Footer} from './footer/Footer'
import {LeftBar} from './leftBar/LeftBar'
import {MainScreen} from './map/MainScreen'
import {Map} from './map/map'
import {Stores} from './utils'
import {styleCommon, styleForSplit} from './utils/styles'

export const App: React.FC<{}> = () => {
  const clsSplit = styleForSplit()
  const classes = styleCommon()
  const stream = useObserver(() => sharedContentsStore.tracks.mainStream)
  const DEBUG_VIDEO = false //  To see all local and remote tracks or not.
  const stores:Stores = {
    map: mapStore,
    participants: participantsStore,
    contents: sharedContentsStore,
  }

  return (
    <ParticipantsProvider value={participantsStore}>
    <ContentsProvider value={sharedContentsStore}>
    <MapProvider value={mapStore}>
      <div className={classes.back}>
        <SplitPane className={classes.fill} split="vertical" resizerClassName={clsSplit.resizerVertical}
          minSize={0} defaultSize="7em">
          <LeftBar {...stores} />
          <Fragment>
            <MainScreen showAllTracks = {DEBUG_VIDEO} />
            <Map transparent={stream !== undefined || DEBUG_VIDEO} {...stores} />
            <Footer {...stores} />
          </Fragment>
        </SplitPane>
      </div>
    </MapProvider>
    </ContentsProvider>
    </ParticipantsProvider >
  )
}
App.displayName = 'App'
