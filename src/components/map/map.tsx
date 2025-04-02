import React, { useEffect } from 'react'
import {Base} from '@components/map/Base'
import {ParticipantLayer} from '@components/map/Participant'
import {ShareLayer} from '@components/map/Share'
import {BackgroundLayer} from './Background'
import {WebGLCanvas} from './Base/WebGLCanvas'
import {createVRMAvatars, VRMAvatars} from '@models/utils/vrm'

export interface MapProps{
  transparent: boolean
}

export const Map: React.FC<MapProps> = (props) => {
  const refCanvas = React.useRef<HTMLCanvasElement>(null)
  const refVRMAvatars = React.useRef<VRMAvatars>()
  if (!refVRMAvatars.current){
    refVRMAvatars.current = createVRMAvatars()
  }

  return <>
    <Base {...props}>
      <BackgroundLayer {...props}/>
      <ShareLayer {...props} />
      <ParticipantLayer {...props} vrmAvatars={refVRMAvatars.current}/>
    </Base>
    <WebGLCanvas refCanvas={refCanvas} vrmAvatars={refVRMAvatars.current}/>
  </>
}
Map.displayName = 'Map'
