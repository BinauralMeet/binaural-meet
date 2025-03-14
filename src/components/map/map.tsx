import React from 'react'
import {Base} from '@components/map/Base'
import {ParticipantLayer} from '@components/map/Participant'
import {ShareLayer} from '@components/map/Share'
import {BackgroundLayer} from './Background'
import {WebGLCanvas} from './Base/WebGLCanvas'
import {ThreeContext} from '@components/avatar/VRMAvatar'

export interface MapProps{
  transparent: boolean
}

export const Map: React.FC<MapProps> = (props) => {
  const refCanvas = React.useRef<HTMLCanvasElement>(null)
  const refThreeCtx = React.useRef<ThreeContext>(null)

  return <>
    <Base {...props}>
      <BackgroundLayer {...props}/>
      <ShareLayer {...props} />
      <ParticipantLayer {...props} refCanvas={refCanvas} refThreeCtx={refThreeCtx}/>
    </Base>
    <WebGLCanvas refCanvas={refCanvas} refThreeCtx={refThreeCtx}/>
  </>
}
Map.displayName = 'Map'
