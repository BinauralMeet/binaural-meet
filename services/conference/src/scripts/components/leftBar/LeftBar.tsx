import React, {useState} from 'react'
import SplitPane from 'react-split-pane'
import {useGesture} from 'react-use-gesture'
import {Stores} from '../utils'
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

export const LeftBar: React.FC<Stores> = (stores) => {
  const classes = styleForSplit()
  const [scale, doSetScale] = useState<number>(1)
  const setScale = (scale:number) => {
    Object.assign(textLineStyle, defaultTextLineHeight)
    textLineStyle.fontSize *= scale
    textLineStyle.lineHeight *= scale
    doSetScale(scale)
  }

  const bind = useGesture(
    {
      onPinch: ({da: [d, a], origin, event, memo}) => {
        if (memo === undefined) {
          return [d, a]
        }
        const [md, ma] = memo

        const MIN_D = 10
        const scaleChange = d > MIN_D ? d / md : d <  -MIN_D ? md / d : (1 + (d - md) / MIN_D)
        setScale(limitScale(scale, scaleChange))
        //  console.log(`Pinch: da:${[d, a]} origin:${origin}  memo:${memo}  scale:${scale}`)

        return [d, a]
      },
      onWheel: ({movement, ctrlKey, event}) => {
        if (ctrlKey) {
        }else {
          //  event?.preventDefault()
          if (stores.map.keyInputUsers.size) { return }
          const scaleChange = Math.pow(1.2, movement[1] / 1000)
          setScale(limitScale(scale, scaleChange))
          //  console.log(`Wheel: ${movement}  scale=${scale}`)
        }
      },
    },
    {
      eventOptions:{passive:false}, //  This prevents default zoom by browser when pinch.
    },
  )


  return (
    <div {...bind()}>
      <SplitPane split="horizontal" defaultSize="50%" resizerClassName = {classes.resizerHorizontal}
        paneStyle = {{overflowY: 'auto', overflowX: 'hidden', width:'100%'}} >
        <ParticipantList {...stores} {...textLineStyle} />
        <ContentList {...stores}  {...textLineStyle} />
      </SplitPane >
    </div>
  )
}
LeftBar.displayName = 'LeftBar'
