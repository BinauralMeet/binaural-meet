import { Room } from '@stores/Room'
import React, {useState} from 'react'
import SplitPane from 'react-split-pane'
import {styleForSplit} from '../utils/styles'
import {ContentList} from './ContentList'
import {ParticipantList} from './ParticipantList'

export interface TextLineStyle {
  lineHeight: number
  fontSize: number
}
const defaultTextLineHeight = {
  lineHeight:20,
  fontSize:16,
}

function limitScale(currentScale: number, scale: number): number {
  const targetScale = currentScale * scale
  const maxScale = 4
  const minScale = 0.5

  if (targetScale > maxScale) { return maxScale }
  if (targetScale < minScale) { return minScale }

  return targetScale
}
const textLineStyle = Object.assign({}, defaultTextLineHeight)
export interface ListBarProps{
  room: Room
}

export const LeftBar: React.FC<ListBarProps> = (props: ListBarProps) => {
  const classes = styleForSplit()
  const [scale, doSetScale] = useState<number>(1)
  const setScale = (scale:number) => {
    Object.assign(textLineStyle, defaultTextLineHeight)
    textLineStyle.fontSize *= scale
    textLineStyle.lineHeight *= scale
    doSetScale(scale)
  }


  return (
    <SplitPane split="horizontal" defaultSize="50%" resizerClassName = {classes.resizerHorizontal}
      paneStyle = {{overflowY: 'auto', overflowX: 'hidden', width:'20%'}} >
      <ParticipantList {...props} {...textLineStyle} />
      <ContentList {...props}  {...textLineStyle} />
    </SplitPane >
  )
}
LeftBar.displayName = 'LeftBar'
