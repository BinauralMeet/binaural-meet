import rooms from '@stores/Rooms'
import {Observer} from 'mobx-react-lite'
import React, {CSSProperties, useEffect} from 'react'
import SplitPane from 'react-split-pane'
import {ContentList} from './leftBar/ContentList'
import {ParticipantList} from './leftBar/ParticipantList'
import {styleForSplit} from './utils/styles'


export const App: React.FC<{}> = () => {
  useEffect(()=>{
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
      console.error(message, source, lineno, colno, error)
    }
  }, [])
  const classes = styleForSplit()
  const textLineHeight = {
    lineHeight:20,
    fontSize:16,
  }

  const roomDivStyle:CSSProperties = {
    width:'20%',
    overflowX:'hidden',
    borderWidth:'0 2px 0 0',
    borderStyle: 'solid',
    borderColor: 'black',
  }

  return <div style={{position:'absolute', top:0, width:'100%', height:'100%',
    backgroundColor:'whitesmoke'}}>
    <Observer>{()=>{
      const roomArray = Array.from(rooms.rooms.values())

      return <SplitPane split="horizontal" defaultSize="50%"
        resizerClassName = {classes.resizerHorizontal}
        paneStyle = {{overflowY: 'auto', overflowX: 'hidden', width:'100%'}} >
        <div style={{display:'flex', width:'100%', height:'100%'}}>
          {roomArray.map(room => <div style={roomDivStyle}>
            <ParticipantList room={room} key={room.name} {...textLineHeight} />
          </div>)}
        </div>
        <div style={{display:'flex', width:'100%', height:'100%'}}>
          {roomArray.map(room => <div style={roomDivStyle}>
            <ContentList room={room} key={room.name} {...textLineHeight} />
          </div>)}
        </div>
      </SplitPane>
    }}</Observer>
  </div>
}
App.displayName = 'App'
