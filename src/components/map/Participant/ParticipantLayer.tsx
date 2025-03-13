import {Participant, PARTICIPANT_SIZE} from '@models/Participant'
import {urlParameters} from '@models/url'
import {useObserver} from 'mobx-react-lite'
import React from 'react'
import {MemoedLocalParticipant as LocalParticipant} from './LocalParticipant'
import {MouseCursor} from './MouseCursor'
import {PlaybackParticipant} from './PlaybackParticipant'
import {RemoteParticipant} from './RemoteParticipant'
import { participants } from '@stores/'
import * as THREE from 'three'
import { MAP_SIZE } from '@components/Constants'
import {ThreeContext, vrmSetPose, VRMUpdateReq} from '../../avatar/VRMAvatar'

interface LineProps {
  start: [number, number]
  end: [number, number]
  remote: string,
}

const Line: React.FC<LineProps> = (props) => {
  const left = Math.min(props.start[0], props.end[0])
  const top = Math.min(props.start[1], props.end[1])
  const width = Math.abs(props.start[0] - props.end[0])
  const height = Math.abs(props.start[1] - props.end[1])

  return <svg xmlns="http://www.w3.org/2000/svg" style={{position:'absolute', left, top, width, height, pointerEvents:'stroke'}}
    viewBox={`0, 0, ${width}, ${height}`}
    onClick = {() => {
      participants.yarnPhones.delete(props.remote)
      participants.yarnPhoneUpdated = true
    }}
    >
    <line x1={props.start[0] - left} y1={props.start[1] - top}
      x2={props.end[0] - left} y2={props.end[1] - top} stroke="black" />
  </svg>
}

function createThreeContext(ref: React.MutableRefObject<ThreeContext|null>, canvas: HTMLCanvasElement){
  const ctx:ThreeContext = {
    clock:new THREE.Clock(),
    renderer : new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      canvas: canvas
    }),
    camera: new THREE.PerspectiveCamera(
      35,
      1,
      0.1,
      2000,
    ),
    scene: new THREE.Scene(),
    updateReqs: new Map<string, VRMUpdateReq>()
  }
  ref.current = ctx
  canvas.addEventListener('webglcontextlost', (ev)=>{
    console.log('webglcontextlost');
    ev.preventDefault();
    createThreeContext(ref, canvas)
  })
  ctx.renderer.setSize(MAP_SIZE, MAP_SIZE)
  ctx.renderer.setClearColor(new THREE.Color(0,0,0))
  ctx.renderer.setClearAlpha(0)
  ctx.renderer.autoClear = false

  //ctx.renderer.setPixelRatio(window.devicePixelRatio * 4)
  const light = new THREE.DirectionalLight(0xffffff)
  light.position.set(1, 1, 1).normalize()
  ctx.scene.add(light)
}

const viewportSize = [200, 200]

export const ParticipantLayer: React.FC = () => {
  //  Create three.js context and render it.
  const refThreeCtx = React.useRef<ThreeContext>(null)
  const refCanvas = React.useRef<HTMLCanvasElement>(null)
  React.useEffect(()=>{
    if (!refCanvas.current) return
    //  create context
    createThreeContext(refThreeCtx, refCanvas.current)
    console.log(`createThreeContext() called: ${refThreeCtx.current}`)

    //  render
    let animate = () => {
      requestAnimationFrame(animate)
      const ctx = refThreeCtx.current!
      //  console.log(`animate() called req:${ctx.updateReqs?.size}`)
      ctx.updateReqs?.forEach((req, pid)=>{
        if (req.vrm && ctx) {
          vrmSetPose(req.vrm, req.rig)                //  apply rig
          req.vrm.update(ctx.clock.getDelta());   //  Update model to render physics
          const rad = req.ori / 180 * Math.PI
          //mem.camera?.position.set(-Math.sin(rad)*3, 2, -Math.cos(rad)*3)
          //mem.camera?.lookAt(0,0.93,0)
          ctx.camera?.position.set(-Math.sin(rad)*3, 0.8, -Math.cos(rad)*3)
          ctx.camera?.lookAt(0,0.8,0)
          ctx.scene.add(req.vrm.scene)
          ctx.renderer.setViewport(req.pos[0] + MAP_SIZE/2 - viewportSize[0]/2, MAP_SIZE/2 - req.pos[1],
            viewportSize[0], viewportSize[1])
          ctx.renderer.render(ctx.scene, ctx.camera)
          ctx.scene.remove(req.vrm.scene)
        }else{
          console.log(`VRMAvatar render failed: ctx=${ctx} vrm=${req.vrm}`)
        }
      })
      //ctx?.updateReqs.clear()
    }
    animate()
    return ()=>{
      animate = ()=>{}
      if (refThreeCtx.current){
        refThreeCtx.current.scene.clear()
        refThreeCtx.current.renderer.dispose()
      }
      console.log('unmount')
    }
  },[refCanvas.current])

  const remotes = useObserver(() => {
    const rs = Array.from(participants.remote.values()).filter(r => r.physics.located)
    const all:Participant[] = Array.from(rs)
    all.push(participants.local)
    all.sort((a,b) => a.pose.position[1] - b!.pose.position[1])
    for(let i=0; i<all.length; ++i){
      all[i].zIndex = i+1
    }
    //rs.sort((a,b) => a.pose.position[1] - b!.pose.position[1])
    return rs
  })
  const localId = useObserver(() => participants.localId)

  const remoteElements = remotes.map((r, index) => <RemoteParticipant key={r.id}
    participant={r} size={PARTICIPANT_SIZE} zIndex={index} refCtx={refThreeCtx}/>)
  const localElement = (<LocalParticipant key={'local'} participant={participants.local}
    size={PARTICIPANT_SIZE} refCtx={refThreeCtx}/>)
  const lines = useObserver(
    () => Array.from(participants.yarnPhones).map((rid) => {
      const start = participants.local.pose.position
      const remote = participants.remote.get(rid)
      if (!remote) { return undefined }
      const end = remote.pose.position

      return <Line start={start} end={end} key={rid} remote={rid}/>
    }),
  )
  const playIds = useObserver(()=> Array.from(participants.playback.keys()))
  const playbackElements = playIds.map((id, index) => <PlaybackParticipant key={id}
    participant={participants.playback.get(id)!} size={PARTICIPANT_SIZE} zIndex={index} refCtx={refThreeCtx}/>)

  const mouseIds = useObserver(() => Array.from(participants.remote.keys()).filter(id => (participants.find(id)!.mouse.show)))
  const remoteMouseCursors = mouseIds.map(
    id => <MouseCursor key={`M_${id}`} participantId={id}/>)

  const showLocalMouse = useObserver(() => participants.local.mouse.show)
  const localMouseCursor = showLocalMouse
    ? <MouseCursor key={'M_local'} participantId={localId} /> : undefined

  if (urlParameters.testBot !== null) { return <div /> }
  const HALF = 0.5

  //  zIndex is needed to show the participants over the share layer.
  return(
    <div style={{position:'absolute', zIndex:0x7FFF}}>
      {lines}
      {playbackElements}
      {remoteElements}
      {localElement}
      <canvas style={{
        position: 'absolute',
        top: - MAP_SIZE * HALF,
        left: - MAP_SIZE * HALF,
        height: MAP_SIZE,
        width: MAP_SIZE,
        pointerEvents:'none'}}
        ref={refCanvas}/>
      {remoteMouseCursors}
      {localMouseCursor}
    </div>
  )
}

ParticipantLayer.displayName = 'ParticipantsLayer'
