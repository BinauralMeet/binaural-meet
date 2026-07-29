import React, {useRef} from 'react'
import * as THREE from 'three'
import {freeRenderTarget, freeScene, VRMAvatar, VRMAvatars} from "@models/utils/vrm"
import map from "@stores/map/Map"
import { participants } from "@stores/participants"
import {loadAdjuster} from "@models/conference/LoadAdjuster"
import {selectByProximity} from "@models/conference/LoadAdjusterLogic"

declare const d:any                  //  from index.html

//  Minimum ms between rendered frames inside the requestAnimationFrame loop below -- caps
//  rendering to roughly 1000/60 =~ 17fps regardless of the browser's actual RAF rate.
const frameThrottleMs = 60
const posScale = 0.01

interface WebGLContext{
  canvas: HTMLCanvasElement
  scene: THREE.Scene
  renderer: THREE.WebGLRenderer
  onscreen: THREE.WebGLRenderTarget
  offscreen: THREE.WebGLRenderTarget
  selfSprite: THREE.Sprite
  mirrorSprite: THREE.Sprite
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

//  CPU-load response (see LoadAdjuster.ts / docs/auto-load-adjustment-design.md §4.2): when
//  loadAdjuster.autoAvatarLimit is finite, keep only the closest `limit` remote VRM avatars
//  updated/rendered each frame. This does not unmount/dispose the excluded avatars (they stay
//  loaded in vas.remotes) -- only skips the per-frame update+render cost, since repeatedly
//  reloading VRM models under fluctuating load would be worse than the load it's trying to fix.
function selectAvatarsToRender(remotes: VRMAvatar[], localPos: [number, number], limit: number): VRMAvatar[] {
  return selectByProximity(
    remotes.map(avatar => ({
      item: avatar,
      onStage: avatar.participant.physics.onStage,
      position: avatar.participant.pose.position,
    })),
    localPos, limit)
}

function renderAvatar(ctx: WebGLContext, avatar:VRMAvatar, camera:THREE.Camera, ori?:number, distIn?: number){
  if (ori===undefined){
    const oriOffset = (avatar.participant.pose.orientation+360*2) % 360 - 180
    ori = 180 + oriOffset / 2
  }else{
    ori += 180
  }
  ori -= avatar.participant.pose.orientation
  const rad = ori / 180 * Math.PI
  const dist = distIn ? distIn : 5
  camera.position.x = avatar.participant.pose.position[0]*posScale + Math.sin(rad)*dist
  camera.position.z = avatar.participant.pose.position[1]*posScale + Math.cos(rad)*dist
  camera.position.y = dist*0.3
  camera.lookAt(avatar.participant.pose.position[0]*posScale, dist*0.3, avatar.participant.pose.position[1]*posScale)

  ctx.scene.add(avatar.vrm.scene)
  ctx.renderer.render(ctx.scene, camera)
  ctx.scene.remove(avatar.vrm.scene)
  //console.log(`render 2.5 avatar ${JSON.stringify(avatar.pose.orientation)}`)
}


export interface WebGLCanvasProps{
  refCanvasGL: React.RefObject<HTMLCanvasElement>
  refCanvas2D: React.RefObject<HTMLCanvasElement>
  vrmAvatars: VRMAvatars
}

function createThreeContext(canvas: HTMLCanvasElement){
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    canvas: canvas
  })
  renderer.autoClear = false
  const offscreen = new THREE.WebGLRenderTarget(600, 300)
  const rv:WebGLContext = {
    canvas: canvas,
    renderer,
    onscreen: renderer.getRenderTarget()!,
    offscreen,
    scene: new THREE.Scene(),
    selfSprite: new THREE.Sprite(new THREE.SpriteMaterial({map: offscreen.texture, alphaTest:0.001, opacity:0.5})),
    mirrorSprite: new THREE.Sprite(new THREE.SpriteMaterial({map: offscreen.texture, alphaTest:0.001, opacity:0.6, depthTest:false})),
  }
  rv.renderer.setClearColor(new THREE.Color(0,0,0), 0)
  rv.renderer.clear(true, true, true)
  const light = new THREE.DirectionalLight(0xffffff)
  light.position.set(1, 1, 1).normalize()
  rv.scene.add(light)
  return rv
}
function freeThreeContext(ctx: WebGLContext){
  ctx.selfSprite.material.dispose();
  ctx.mirrorSprite.material.dispose();
  ctx.selfSprite.geometry.dispose();
  ctx.mirrorSprite.geometry.dispose();

  if (ctx.renderer) {
    ctx.renderer.dispose()
  }

  freeScene(ctx.scene)
  freeRenderTarget(ctx.offscreen)
  freeRenderTarget(ctx.onscreen)
}



export const WebGLCanvas: React.FC<WebGLCanvasProps> = (props:WebGLCanvasProps) => {
  const refWebGLContext = useRef<WebGLContext>()
  React.useEffect(()=>{
    //console.log('WebGL mount')
    if (!props.refCanvasGL.current) return
    const vas = props.vrmAvatars

    let ctx = refWebGLContext.current = createThreeContext(props.refCanvasGL.current)
    const onContextLost = (ev: Event) => {
      freeThreeContext(ctx)
      console.log('webglcontextlost');
      ev.preventDefault();
      ctx = refWebGLContext.current = createThreeContext(ctx.canvas)
    }
    ctx.canvas.addEventListener('webglcontextlost', onContextLost)

    //  render
    let prevTime = 0
    let filteredFaceDir=0
    let animationFrameId: number;
    let animate = (time:number) => {
      animationFrameId = requestAnimationFrame(animate)
      const dt = time - prevTime
      if (dt < frameThrottleMs) return
      //  prevTime===0 only on the very first frame -- `dt` there is bogus (time since page load,
      //  not since a previous rendered frame), so skip feeding it to the load detector.
      if (prevTime !== 0) { loadAdjuster.recordFrameInterval(dt, frameThrottleMs) }
      prevTime = time

      if (!props.refCanvasGL.current) return
      const mapSize = map.screenSize
      ctx.renderer.setDrawingBufferSize(mapSize[0], mapSize[1], 1)
      ctx.renderer.clear(true, true, true)

      //  console.log(`canvas2: ${refCanvas2.current}`)

      if(vas.local && vas.local.structure?.face){
        //  Fliter face direction and set it for sound localization etc.
        const face = vas.local.structure?.face
        const cur = face.head.y
        const diff = (cur - filteredFaceDir) * 0.3
        filteredFaceDir += diff
        participants.local.faceDir = filteredFaceDir*(180/Math.PI)
        //console.log(`face:${participants.local.faceDir}, ori:${participants.local.pose.orientation}`)
        if (participants.local.rotateAvatarByFace){
          //  Update local avatar's orientation from the face rig (camera)
          participants.local.pose.orientation += diff * (180/Math.PI)
        }
      }else{
        const diff = -filteredFaceDir * 0.3
        filteredFaceDir += diff
        if (participants.local.rotateAvatarByFace){
          participants.local.pose.orientation += diff * (180/Math.PI)
        }
      }

      if (participants.local.avatarDisplay2_5D || participants.local.avatarDisplay3D){
        //  Update avatars
        const remotes = selectAvatarsToRender(
          Array.from(vas.remotes.values()), participants.local.pose.position, loadAdjuster.autoAvatarLimit)
        const avatars = vas.local? [...remotes, vas.local] : remotes
        for(const avatar of avatars){
          avatar.vrm.scene.position.x = avatar.participant.pose.position[0]*posScale
          avatar.vrm.scene.position.z = avatar.participant.pose.position[1]*posScale
          avatar.vrm.scene.rotation.y = -avatar.participant.pose.orientation / 180 * Math.PI
          avatar.vrm.update(frameThrottleMs / 1000);   //  Update model to render physics
        }

        //  3D mode
        if (participants.local.avatarDisplay3D && map.isInCenter()){
          //refCanvas.current.style.opacity = '0.6'
          const viewportSize = [mapSize[0], mapSize[1]]
          ctx.renderer.setViewport(0, mapSize[1]-viewportSize[1], mapSize[0], viewportSize[1])
          const camera3D = new THREE.PerspectiveCamera(45, viewportSize[0]/viewportSize[1], 0.2, 100000)
          camera3D.setViewOffset(viewportSize[0], viewportSize[1], 0, 100, viewportSize[0], viewportSize[1])
          camera3D.updateProjectionMatrix()
          const cameraHeight = 0.6
          const viewScale = 0.1
          let rad = -participants.local.pose.orientation/180*Math.PI
          if (participants.local.avatarDisplay3D && participants.local.viewRotateByFace){
            rad -= filteredFaceDir
          }
          const viewDir = [-Math.sin(rad), -Math.cos(rad)]
          camera3D.position.set(participants.local.pose.position[0]*posScale - viewDir[0]*viewScale, cameraHeight, participants.local.pose.position[1]*posScale - viewDir[1]*viewScale)
          camera3D.lookAt(participants.local.pose.position[0]*posScale, cameraHeight, participants.local.pose.position[1]*posScale)

          //  draw remote 3D avatars and self sprite
          for(const avatar of remotes){
            if (avatar.nameLabel) avatar.vrm.scene.add(avatar.nameLabel)
            if (avatar.nameLabelOuter){
              avatar.vrm.scene.add(avatar.nameLabelOuter)
              avatar.nameLabelOuter.material.opacity = Math.pow(avatar.participant.audioLevel, 0.5)
            }
            ctx.scene.add(avatar.vrm.scene)
          }
          ctx.renderer.render(ctx.scene, camera3D)
          for(const avatar of remotes){
            ctx.scene.remove(avatar.vrm.scene)
            if (avatar.nameLabel) avatar.vrm.scene.remove(avatar.nameLabel)
            if (avatar.nameLabelOuter) avatar.vrm.scene.remove(avatar.nameLabelOuter)
          }

          //  draw face mirror
          if (vas.local){
            ctx.renderer.setRenderTarget(ctx.offscreen)
            //vas.renderer.setClearColor(new THREE.Color(1,0,0), 1)
            ctx.renderer.clear(true, true, true)
            //vas.renderer.setClearColor(new THREE.Color(0,0,0), 0)
            const offCamera = createAvatarCamera([ctx.offscreen.width, ctx.offscreen.height])
            ctx.renderer.setViewport(0, 0, ctx.offscreen.width, ctx.offscreen.height)
            renderAvatar(ctx, vas.local, offCamera, filteredFaceDir, 1.3)
            //  set onscreen position
            ctx.mirrorSprite.position.x = 0
            ctx.mirrorSprite.position.z = 0
            ctx.mirrorSprite.position.y = 0
            ctx.mirrorSprite.scale.x = (ctx.offscreen.width / ctx.offscreen.height)
            ctx.offscreen.texture.repeat.set(-1, 1);
            ctx.offscreen.texture.offset.set( 1, 0);

            ctx.renderer.setRenderTarget(ctx.onscreen)
            ctx.scene.add(ctx.mirrorSprite)

            const mirrorSize = [200, 500]
            //const mirrorSize = [600, 1000]
            ctx.renderer.setViewport(mapSize[0]-mirrorSize[0], -150, mirrorSize[0], mirrorSize[1])
            const camera = new THREE.PerspectiveCamera(45, mirrorSize[0]/mirrorSize[1], 0.1, 100000)
            camera.updateProjectionMatrix()
            camera.position.x = 0
            camera.position.y = 0
            camera.position.z = 3
            ctx.renderer.render(ctx.scene, camera)
            ctx.scene.remove(ctx.mirrorSprite)
            ctx.offscreen.texture.repeat.set(1, 1);
            ctx.offscreen.texture.offset.set(0, 0);
          }
        }



        //  2.5D mode
        if (participants.local.avatarDisplay2_5D){
          const viewportSize:[number, number] = [200 * map.scale, 500 * map.scale]
          const camera = createAvatarCamera(viewportSize)
          const avatars = vas.local ? [...remotes, vas.local] : remotes
          for(const avatar of avatars){
            //  console.log(`render3d() ori: ${ori}`)
            if (avatar.vrm) {
              const pos = map.toElement(avatar.participant.pose.position)
              ctx.renderer.setViewport(pos[0]-viewportSize[0]/2, mapSize[1]-pos[1], viewportSize[0], viewportSize[1])
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
    }
    animate(0)
    return ()=>{
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId)
      }
      ctx.canvas.removeEventListener('webglcontextlost', onContextLost)
      freeThreeContext(ctx)
      //  console.log('WebGL unmount')
    }
  },[props.refCanvasGL.current, props.refCanvas2D.current, props.vrmAvatars])


return <>
      <canvas style={{
        position: 'absolute',
        top: 0,
        left: 0,
        height: '100%',
        width: '100%',
        pointerEvents:'none'}}
        ref={props.refCanvas2D}>
      </canvas>
  <canvas style={{
        position: 'absolute',
        top: 0,
        left: 0,
        height: '100%',
        width: '100%',
        pointerEvents:'none'}}
        ref={props.refCanvasGL}>
      </canvas>
  </>
  }
