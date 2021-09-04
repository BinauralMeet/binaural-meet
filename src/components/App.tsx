import {StoreProvider as ChatProvider} from '@hooks/ChatStore'
import {StoreProvider as MapProvider} from '@hooks/MapStore'
import {StoreProvider as ParticipantsProvider} from '@hooks/ParticipantsStore'
import {StoreProvider as ContentsProvider} from '@hooks/SharedContentsStore'
import { urlParameters } from '@models/url'
import {isPortrait, isSmartphone} from '@models/utils'
import chatStore from '@stores/Chat'
import errorInfo from '@stores/ErrorInfo'
import mapStore from '@stores/Map'
import participantsStore from '@stores/participants/Participants'
import sharedContentsStore from '@stores/sharedContents/SharedContents'
import {Observer} from 'mobx-react-lite'
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
  const DEBUG_VIDEO = false //  To see all local and remote tracks or not.
  const stores:Stores = {
    map: mapStore,
    participants: participantsStore,
    contents: sharedContentsStore,
    chat: chatStore,
  }
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

  //  Global error handler
  window.onerror = (message, source, lineno, colno, error) => {
    if ((error?.message === 'Ping timeout' || error?.message === 'Strophe: Websocket error [object Event]')
     && message === null && source === null && lineno === null && colno === null){
      errorInfo.setType('connection')
      if (urlParameters.testBot !== null){  //  testBot
        window.location.reload()  //  testBot will reload when connection is cutted off.
      }
    }else{
      console.warn(`Global handler: ${message}`, source, lineno, colno, error)
    }

    return true
  }


  return (
    <ParticipantsProvider value={participantsStore}>
    <ChatProvider value={chatStore}>
    <ContentsProvider value={sharedContentsStore}>
    <MapProvider value={mapStore}>
      <div ref={refDiv} className={classes.back}>
        <SplitPane className={classes.fill} split="vertical" resizerClassName={clsSplit.resizerVertical}
          minSize={0} defaultSize="7em">
          <LeftBar {...stores} />
          <Fragment>
            <MainScreen showAllTracks = {DEBUG_VIDEO} />
            <Observer>{() => <Map transparent={sharedContentsStore.tracks.mainStream !== undefined
             || DEBUG_VIDEO} {...stores} />
            }</Observer>
            <Footer {...stores} height={(isSmartphone() && isPortrait()) ? 100 : undefined} />
          </Fragment>
        </SplitPane>
      </div>
    </MapProvider>
    </ContentsProvider>
    </ChatProvider>
    </ParticipantsProvider >
  )
}
App.displayName = 'App'
