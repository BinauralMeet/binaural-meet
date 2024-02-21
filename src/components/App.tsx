import {urlParameters} from '@models/url'
import {isPortrait, isSmartphone} from '@models/utils'
import { rgb2Color } from '@models/utils'
import chatStore from '@stores/Chat'
import errorInfo from '@stores/ErrorInfo'
import mapStore from '@stores/Map'
import participantsStore from '@stores/participants/Participants'
import roomInfo from '@stores/RoomInfo'
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
import { GoogleOAuthProvider } from "@react-oauth/google";

export const App: React.FC<{}> = () => {
  const clsSplit = styleForSplit()
  const classes = styleCommon()
  const DEBUG_VIDEO = false //  To see all local and remote tracks or not.
  const stores:Stores = {
    map: mapStore,
    participants: participantsStore,
    contents: sharedContentsStore,
    chat: chatStore,
    roomInfo: roomInfo,
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

  return <Observer>{()=>{
    return <div ref={refDiv} className={classes.back} style={{backgroundColor: rgb2Color(roomInfo.backgroundFill)}}>
      <GoogleOAuthProvider clientId="XXXXXXXXXXXX.apps.googleusercontent.com">
        <SplitPane className={classes.fill} split="vertical" resizerClassName={clsSplit.resizerVertical}
          minSize={0} defaultSize="7em">
          <LeftBar stores={stores}/>
          <Fragment>
            <MainScreen showAllTracks = {DEBUG_VIDEO} stores={stores} />
            <Observer>{() => <Map transparent={sharedContentsStore.mainScreenStream !== undefined
             || DEBUG_VIDEO} stores={stores} />
            }</Observer>
            <Footer stores={stores} height={(isSmartphone() && isPortrait()) ? 100 : undefined} />
          </Fragment>
        </SplitPane>
      </GoogleOAuthProvider>
      </div>
  }}</Observer>
}
App.displayName = 'App'
