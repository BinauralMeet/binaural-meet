import React from 'react'
import SplitPane from 'react-split-pane'
import {Stores} from '../utils'
import {styleForSplit} from '../utils/styles'
import {ContentList} from './ContentList'
import {ParticipantList} from './ParticipantList'

export const LeftBar: React.FC<Stores> = (stores) => {
  const classes = styleForSplit()

  return (
    <SplitPane split="horizontal" defaultSize="50%" resizerClassName = {classes.resizerHorizontal}
      paneStyle = {{overflowY: 'auto', overflowX: 'hidden', width:'100%'}} >
      <ParticipantList {...stores} />
      <ContentList {...stores} />
    </SplitPane >
  )
}
LeftBar.displayName = 'LeftBar'
