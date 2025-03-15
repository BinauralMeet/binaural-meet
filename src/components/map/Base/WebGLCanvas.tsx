import { ThreeContext, vrmSetPose, VRMUpdateReq } from "@components/avatar/VRMAvatar"
import React from "react"
import * as THREE from 'three'
import * as Kalidokit from 'kalidokit'
import map from "@stores/Map"
import { participants } from "@stores/participants"
import { normV, subV2 } from "@models/utils"
import { PARTICIPANT_SIZE } from "@models/Participant"


function createThreeContext(ref: React.MutableRefObject<ThreeContext|null>, canvas: HTMLCanvasElement){
  const ctx:ThreeContext = {
    clock:new THREE.Clock(),
    renderer : new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      canvas: canvas
    }),
    scene: new THREE.Scene(),
    remotes: new Map<string, VRMUpdateReq>()
  }
  ref.current = ctx
  canvas.addEventListener('webglcontextlost', (ev)=>{
    console.log('webglcontextlost');
    ev.preventDefault();
    createThreeContext(ref, canvas)
  })
  ctx.renderer.setClearColor(new THREE.Color(0,0,0))
  ctx.renderer.setClearAlpha(0)
  ctx.renderer.setPixelRatio(window.devicePixelRatio * 4)
  ctx.renderer.autoClear = false

  const light = new THREE.DirectionalLight(0xffffff)
  light.position.set(1, 1, 1).normalize()
  ctx.scene.add(light)
}

function updateVrmAvatar(avatar:VRMUpdateReq, ctx: ThreeContext){
  if (!avatar.rendered){
    vrmSetPose(avatar.vrm, avatar.rig)  //  apply rig
    avatar.rendered = true
  }
  avatar.vrm.update(ctx.clock.getDelta());   //  Update model to render physics
}
function createAvatarCamera(viewportSize:[number, number]){
  const camera = new THREE.PerspectiveCamera(
    35,
    viewportSize[0]/viewportSize[1],
    0.1,
    1000,
  )

  return camera
}
function renderAvatar(ctx: ThreeContext, avatar:VRMUpdateReq, camera:THREE.Camera, ori?:number){
  if (ori===undefined){
    const oriOffset = (avatar.pose.orientation+720) % 360 - 180
    ori = 180 + oriOffset / 2
  }else{
    ori += 180
  }
  const rad = ori / 180 * Math.PI
  const dist = 5
  camera.position.set(Math.sin(rad)*dist, dist*0.3, Math.cos(rad)*dist)
  camera.lookAt(0, dist*0.3, 0)

  avatar.vrm.scene.position.x = 0
  avatar.vrm.scene.position.z = 0
  avatar.vrm.scene.scale.x = avatar.vrm.scene.scale.y = avatar.vrm.scene.scale.z = 1
  avatar.vrm.scene.setRotationFromEuler(new THREE.Euler(0,0,0))
  ctx.scene.add(avatar.vrm.scene)
  ctx.renderer.render(ctx.scene, camera)
  ctx.scene.remove(avatar.vrm.scene)
}

export interface WebGLCanvasProps{
  refCanvas: React.RefObject<HTMLCanvasElement>
  refThreeCtx: React.RefObject<ThreeContext>
}
export const WebGLCanvas: React.FC<WebGLCanvasProps> = (props) => {
  const refCanvas = props.refCanvas
  const refThreeCtx = props.refThreeCtx

  React.useEffect(()=>{
    if (!refCanvas.current) return
    //  create context
    createThreeContext(refThreeCtx, refCanvas.current)
    //console.log(`createThreeContext() called: ${refThreeCtx.current}`)

    //  render
    let prevTime = 0
    let lastLocalOri=0
    let animate = (time:number) => {
      requestAnimationFrame(animate)
      if (time - prevTime < 20) return
      prevTime = time

      if (!refCanvas.current) return
      const ctx = refThreeCtx.current!
      const mapSize = map.screenSize
      ctx.renderer.setDrawingBufferSize(mapSize[0], mapSize[1], 1)
      ctx.renderer.clear(true, true, true)

      //  update local avatar's orientation
      if (participants.local.avatarDisplay2_5D || participants.local.avatarDisplay3D){
        if(ctx.local && ctx.local.rig && ctx.local.rig.face){
          const face = ctx.local.rig.face as Kalidokit.TFace
          const cur = face.head.y
          const diff = (cur - lastLocalOri) * 0.3
          lastLocalOri += diff
          participants.local.pose.orientation += diff * (180/Math.PI)
        }
      }

      //  draw 3D avatars
      if (participants.local.avatarDisplay3D && map.isInCenter()){
        //refCanvas.current.style.opacity = '0.6'
        const viewportSize = [mapSize[0], mapSize[1]*0.8]
        ctx.renderer.setViewport(0, mapSize[1]-viewportSize[1], mapSize[0], viewportSize[1])
        const camera = new THREE.PerspectiveCamera(
          45,
          viewportSize[0]/viewportSize[1],
          0.1,
          100000,
        )
        camera.setViewOffset(viewportSize[0], viewportSize[1], 0, 100, viewportSize[0], viewportSize[1])
        camera.updateProjectionMatrix()
        camera.position.set(0, 1.2, 0)
        camera.lookAt(0, 1.0, -1)

        const localPos = participants.local.pose.position
        const localOri = participants.local.pose.orientation / 180.0 * Math.PI
        const farDist = PARTICIPANT_SIZE * 1000
        const avatars:VRMUpdateReq[] = []
        ctx.remotes.forEach((remote)=>{
          const diff = subV2(remote.pose.position, localPos)
          remote.dist = normV(diff)
          const oriFromHead = (Math.atan2(diff[1], diff[0]) - localOri + 4*Math.PI) % (2*Math.PI) - 1.5*Math.PI
          remote.dir = 0.8*oriFromHead - 0.5*Math.PI
          //console.log(`r:${pid} dir: ${remote.dir}`)
          remote.ori = -(remote.pose.orientation/180*Math.PI - localOri)
          if (remote.dist < farDist){
            avatars.push(remote)
          }
        })
        //if(ctx.local) avatars.push(ctx.local)
        for(const avatar of avatars){
          if (!avatar.rendered){
            vrmSetPose(avatar.vrm, avatar.rig)  //  apply rig
            avatar.rendered = true
          }
          if (avatar.dist && avatar.dir && avatar.ori){
            avatar.vrm.scene.setRotationFromEuler(new THREE.Euler(0, avatar.ori, 0))
            const distMul = 0.015 / Math.abs(Math.sin(avatar.dir))
            avatar.vrm.scene.position.x = distMul * avatar.dist * Math.cos(avatar.dir)
            avatar.vrm.scene.position.z = distMul * avatar.dist * Math.sin(avatar.dir)
            avatar.vrm.scene.scale.x = avatar.vrm.scene.scale.y = avatar.vrm.scene.scale.z = Math.abs(Math.sin(avatar.dir))
            if (avatar.nameLabel) avatar.vrm.scene.add(avatar.nameLabel)
          }
          ctx.scene.add(avatar.vrm.scene)
        }
        ctx.renderer.render(ctx.scene, camera)
        for(const avatar of avatars){
          ctx.scene.remove(avatar.vrm.scene)
          if (avatar.nameLabel) avatar.vrm.scene.remove(avatar.nameLabel)
        }
        if (ctx.local){
          const viewportSize:[number,number] = [200, 500]
          ctx.renderer.setViewport(mapSize[0]-viewportSize[0], 0, viewportSize[0], viewportSize[1])
          updateVrmAvatar(ctx.local, ctx)
          const camera = createAvatarCamera(viewportSize)
          renderAvatar(ctx, ctx.local, camera, lastLocalOri)
        }
      }

      //  draw 2.5D avatars
      if (participants.local.avatarDisplay2_5D){
        const viewportSize = [200 * map.scale, 500 * map.scale]
        const camera = new THREE.PerspectiveCamera(
          35,
          viewportSize[0]/viewportSize[1],
          0.1,
          1000,
        )
        const avatars = Array.from(ctx.remotes.values())
        if(ctx.local) avatars.push(ctx.local)
        for(const avatar of avatars){
          //  console.log(`render3d() ori: ${ori}`)
          if (avatar.vrm && ctx) {
            const pos = map.toElement(avatar.pose.position)
            ctx.renderer.setViewport(pos[0]-viewportSize[0]/2, mapSize[1]-pos[1], viewportSize[0], viewportSize[1])
            updateVrmAvatar(avatar, ctx)
            renderAvatar(ctx, avatar, camera)
            /*
            console.log(`canvas:${refCanvas.current?.width},${refCanvas.current?.height}  map:${mapSize[0]},${mapSize[1]}`)
            console.log(`render avatar:${pid} pos:${Math.trunc(pos[0])}/${mapSize[0]},${Math.trunc(pos[1])}`+
              `m:${Math.trunc(map.mouse[0]-map.offset[0] - map.left)},${Math.trunc(map.mouse[1]-map.offset[1])}`) */
          }else{
            console.log(`VRMAvatar render failed: ctx=${ctx} vrm=${avatar.vrm}`)
          }
        }
        camera.clear()
      }
    }
    animate(0)
    return ()=>{
      animate = ()=>{}
      if (refThreeCtx.current){
        refThreeCtx.current.scene.clear()
        refThreeCtx.current.renderer.dispose()
      }
      //console.log('unmount')
    }
  },[refCanvas.current])

  return <canvas style={{
        position: 'absolute',
        top: 0,
        left: 0,
        height: '100%',
        width: '100%',
        pointerEvents:'none'}}
        ref={refCanvas}>
      </canvas>
}
