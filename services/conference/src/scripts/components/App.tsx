import {StoreProvider as MapProvider} from '@hooks/MapStore'
import {StoreProvider as ParticipantsProvider} from '@hooks/ParticipantsStore'
import {StoreProvider as ContentsProvider} from '@hooks/SharedContentsStore'
import {isPortrait, isSmartphone} from '@models/utils'
import mapStore from '@stores/Map'
import participantsStore from '@stores/participants/Participants'
import sharedContentsStore from '@stores/sharedContents/SharedContents'
import {useObserver} from 'mobx-react-lite'
import React, {Fragment, useRef} from 'react'
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
  const refWin = useRef(window)
  const refDiv = useRef<HTMLDivElement>(null)
  //  toucmove: prevent browser zoom by pinch
  window.addEventListener('touchmove', (ev) => {
    //  if (ev.touches.length > 1) {
    ev.preventDefault()
    //  }
  },                      {passive: false, capture: false})
  //  contextmenu: prevent to show context menu with right mouse click
  window.addEventListener('contextmenu', (ev) => {
    ev.preventDefault()
  },                      {passive: false, capture: false})

  return (
    <ParticipantsProvider value={participantsStore}>
    <ContentsProvider value={sharedContentsStore}>
    <MapProvider value={mapStore}>
      <div ref={refDiv} className={classes.back}>
        <SplitPane className={classes.fill} split="vertical" resizerClassName={clsSplit.resizerVertical}
          minSize={0} defaultSize="7em">
          <LeftBar {...stores} />
          <Fragment>
            <MainScreen showAllTracks = {DEBUG_VIDEO} />
            <Map transparent={stream !== undefined || DEBUG_VIDEO} {...stores} />
            <Footer {...stores} height={(isSmartphone() && isPortrait()) ? 100 : undefined} />
          </Fragment>
        </SplitPane>
      </div>
    </MapProvider>
    </ContentsProvider>
    </ParticipantsProvider >
  )
}
App.displayName = 'App'
