import React from 'react'
import {Base} from '@components/map/Base'
import {ParticipantLayer} from '@components/map/Participant'
import {ShareLayer} from '@components/map/Share'
import {BackgroundLayer} from './Background'
import {WebGLCanvas} from './Base/WebGLCanvas'
import {VRMAvatars} from '@models/utils/vrm'

export interface MapProps{
  transparent: boolean
}

export const Map: React.FC<MapProps> = (props) => {
  const refCanvasGL = React.useRef<HTMLCanvasElement>(null)
  const refCanvas2D = React.useRef<HTMLCanvasElement>(null)
  const refVRMAvatars = React.useRef<VRMAvatars>()
  if (!refVRMAvatars.current){
    refVRMAvatars.current = new VRMAvatars()
  }

  return <>
    <Base {...props}>
      <BackgroundLayer {...props}/>
      <ShareLayer {...props} />
      <ParticipantLayer {...props} vrmAvatars={refVRMAvatars.current}/>
    </Base>
    <WebGLCanvas refCanvasGL={refCanvasGL} refCanvas2D={refCanvas2D} vrmAvatars={refVRMAvatars.current}/>
  </>
}
Map.displayName = 'Map'
