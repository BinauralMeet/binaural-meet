import { vrmSetPose, VRMAvatar, VRMAvatars } from "@components/map/vrm"
import React, { useRef } from 'react'
import * as THREE from 'three'
import * as Kalidokit from 'kalidokit'
import map from "@stores/Map"
import { participants } from "@stores/participants"

declare const d:any                  //  from index.html

const animationPeriod = 20  //  20ms / frame
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


function updateVrmAvatar(avatar:VRMAvatar){
  if (!avatar.rendered){
    vrmSetPose(avatar.vrm, avatar.rig)  //  apply rig
    avatar.rendered = true
  }
  avatar.vrm.update(animationPeriod / 1000);   //  Update model to render physics
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
function renderAvatar(ctx: WebGLContext, vas: VRMAvatars, avatar:VRMAvatar, camera:THREE.Camera, ori?:number, distIn?: number){
  if (ori===undefined){
    const oriOffset = (avatar.pose.orientation+360*2) % 360 - 180
    ori = 180 + oriOffset / 2
  }else{
    ori += 180
  }
  ori -= avatar.pose.orientation
  const rad = ori / 180 * Math.PI
  const dist = distIn ? distIn : 5
  camera.position.x = avatar.pose.position[0]*posScale + Math.sin(rad)*dist
  camera.position.z = avatar.pose.position[1]*posScale + Math.cos(rad)*dist
  camera.position.y = dist*0.3
  camera.lookAt(avatar.pose.position[0]*posScale, dist*0.3, avatar.pose.position[1]*posScale)

  ctx.scene.add(avatar.vrm.scene)
  ctx.renderer.render(ctx.scene, camera)
  ctx.scene.remove(avatar.vrm.scene)
}


export interface WebGLCanvasProps{
  refCanvas: React.RefObject<HTMLCanvasElement>
  vrmAvatars: VRMAvatars
}
export const WebGLCanvas: React.FC<WebGLCanvasProps> = (props:WebGLCanvasProps) => {
  const refWebGLContext = useRef<WebGLContext>()

  React.useEffect(()=>{
    //console.log('WebGL mount')
    if (!props.refCanvas.current) return
    const vas = props.vrmAvatars

    function createThreeContext(canvas: HTMLCanvasElement){
      const renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        canvas: canvas
      })
      const offscreen = new THREE.WebGLRenderTarget(300, 300)
      const rv:WebGLContext = {
        canvas: canvas,
        renderer,
        onscreen: renderer.getRenderTarget()!,
        offscreen,
        scene: new THREE.Scene(),
        selfSprite: new THREE.Sprite(new THREE.SpriteMaterial({map: offscreen.texture, alphaTest:0.001, opacity:0.5})),
        mirrorSprite: new THREE.Sprite(new THREE.SpriteMaterial({map: offscreen.texture, alphaTest:0.001, opacity:0.7})),
      }
      const light = new THREE.DirectionalLight(0xffffff)
      light.position.set(1, 1, 1).normalize()
      rv.scene.add(light)
      return rv
    }
    let ctx = refWebGLContext.current = createThreeContext(props.refCanvas.current)
    ctx.canvas.addEventListener('webglcontextlost', (ev)=>{
      console.log('webglcontextlost');
      ev.preventDefault();
      ctx = refWebGLContext.current = createThreeContext(ctx.canvas)
    })

    //  render
    let prevTime = 0
    let filteredFaceDir=0
    let animate = (time:number) => {
      requestAnimationFrame(animate)
      if (time - prevTime < animationPeriod) return
      prevTime = time

      if (!props.refCanvas.current) return
      const mapSize = map.screenSize
      ctx.renderer.setDrawingBufferSize(mapSize[0], mapSize[1], 1)
      ctx.renderer.clear(true, true, true)

      if(vas.local && vas.local.rig && vas.local.rig.face){
        //  Fliter face direction and set it for sound localization etc.
        const face = vas.local.rig.face as Kalidokit.TFace
        const cur = face.head.y
        const diff = (cur - filteredFaceDir) * 0.3
        filteredFaceDir += diff
        participants.local.faceDir = filteredFaceDir*(180/Math.PI)
        //console.log(`face:${participants.local.faceDir}, ori:${participants.local.pose.orientation}`)
        if ((participants.local.avatarDisplay3D && participants.local.viewRotateByFace) ||
          (!participants.local.avatarDisplay2_5D && !participants.local.avatarDisplay3D)){
          //  Update local avatar's orientation from the face rig (camera)
          participants.local.pose.orientation += diff * (180/Math.PI)
        }
      }

      if (participants.local.avatarDisplay2_5D || participants.local.avatarDisplay3D){
        if(vas.local){
          const avatar = vas.local
          avatar.vrm.scene.position.x = avatar.pose.position[0]*posScale
          avatar.vrm.scene.position.z = avatar.pose.position[1]*posScale
          avatar.vrm.scene.rotation.y = -participants.local.pose.orientation/180*Math.PI
          updateVrmAvatar(avatar)
        }
        //  Update avatars
        const remotes = Array.from(vas.remotes.values())
        for(const avatar of remotes){
          avatar.vrm.scene.position.x = avatar.pose.position[0]*posScale
          avatar.vrm.scene.position.z = avatar.pose.position[1]*posScale
          avatar.vrm.scene.rotation.y = -avatar.pose.orientation / 180 * Math.PI
          updateVrmAvatar(avatar)
        }

        //  3D mode
        if (participants.local.avatarDisplay3D && map.isInCenter()){
          //refCanvas.current.style.opacity = '0.6'
          const viewportSize = [mapSize[0], mapSize[1]*0.6]
          ctx.renderer.setViewport(0, mapSize[1]-viewportSize[1], mapSize[0], viewportSize[1])
          const camera3D = new THREE.PerspectiveCamera(45, viewportSize[0]/viewportSize[1], 0.1, 100000)
          camera3D.setViewOffset(viewportSize[0], viewportSize[1], 0, 160, viewportSize[0], viewportSize[1])
          camera3D.updateProjectionMatrix()
          const cameraHeight = 1.6
          const viewScale = 1.0
          const rad = -participants.local.pose.orientation/180*Math.PI
          const viewDir = [-Math.sin(rad), -Math.cos(rad)]
          camera3D.position.set(participants.local.pose.position[0]*posScale - viewDir[0]*viewScale, cameraHeight, participants.local.pose.position[1]*posScale - viewDir[1]*viewScale)
          camera3D.lookAt(participants.local.pose.position[0]*posScale, cameraHeight-0.2, participants.local.pose.position[1]*posScale)

          //  draw local avatar
          if (vas.local){
            const viewportSize = [ctx.offscreen.width, ctx.offscreen.height]
            const cameraOff = new THREE.PerspectiveCamera(45, viewportSize[0]/viewportSize[1], 0.1, 100000)
            cameraOff.updateProjectionMatrix()
            const cameraHeight = 0.9
            const viewScale = 0.5
            cameraOff.position.set(participants.local.pose.position[0]*posScale - viewDir[0]*viewScale, cameraHeight, participants.local.pose.position[1]*posScale - viewDir[1]*viewScale)
            cameraOff.lookAt(participants.local.pose.position[0]*posScale, cameraHeight-0.2, participants.local.pose.position[1]*posScale)

            //  offscreen rendering
            ctx.renderer.setRenderTarget(ctx.offscreen)
            ctx.renderer.clear(true, true, true)
            ctx.scene.add(vas.local.vrm.scene)
            ctx.renderer.render(ctx.scene, cameraOff)
            ctx.scene.remove(vas.local.vrm.scene)

            //  set onscreen position and render it
            ctx.selfSprite.position.x = vas.local.vrm.scene.position.x
            ctx.selfSprite.position.z = vas.local.vrm.scene.position.z
            ctx.selfSprite.position.y = 0.8
            ctx.selfSprite.scale.x = 0.5
            ctx.selfSprite.scale.y = 0.5
            ctx.renderer.setRenderTarget(ctx.onscreen)
            ctx.scene.add(ctx.selfSprite)
            ctx.renderer.render(ctx.scene, camera3D)
            ctx.scene.remove(ctx.selfSprite)
          }

          //  draw remote 3D avatars and self sprite
          for(const avatar of remotes){
            if (avatar.nameLabel) avatar.vrm.scene.add(avatar.nameLabel)
            ctx.scene.add(avatar.vrm.scene)
          }
          ctx.renderer.render(ctx.scene, camera3D)
          for(const avatar of remotes){
            ctx.scene.remove(avatar.vrm.scene)
            if (avatar.nameLabel) avatar.vrm.scene.remove(avatar.nameLabel)
          }

          //  draw face mirror
          if (vas.local){
            ctx.renderer.setRenderTarget(ctx.offscreen)
            //vas.renderer.setClearColor(new THREE.Color(1,0,0), 1)
            ctx.renderer.clear(true, true, true)
            //vas.renderer.setClearColor(new THREE.Color(0,0,0), 0)
            const offCamera = createAvatarCamera([ctx.offscreen.width, ctx.offscreen.height])
            ctx.renderer.setViewport(0, 0, ctx.offscreen.width, ctx.offscreen.height)
            renderAvatar(ctx, vas, vas.local, offCamera, filteredFaceDir, 2)
            //  set onscreen position
            ctx.mirrorSprite.position.x = 0
            ctx.mirrorSprite.position.z = 0
            ctx.mirrorSprite.position.y = 0
            ctx.offscreen.texture.repeat.set(-1, 1);
            ctx.offscreen.texture.offset.set( 1, 0);

            ctx.renderer.setRenderTarget(ctx.onscreen)
            ctx.scene.add(ctx.mirrorSprite)

            const mirrorSize = [200, 500]
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
              const pos = map.toElement(avatar.pose.position)
              ctx.renderer.setViewport(pos[0]-viewportSize[0]/2, mapSize[1]-pos[1], viewportSize[0], viewportSize[1])
              renderAvatar(ctx, vas, avatar, camera)
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
      animate = ()=>{}
      ctx.scene.clear()
      ctx.renderer.dispose()
      //  console.log('WebGL unmount')
    }
  },[props.refCanvas.current, props.vrmAvatars])

  return <canvas style={{
        position: 'absolute',
        top: 0,
        left: 0,
        height: '100%',
        width: '100%',
        pointerEvents:'none'}}
        ref={props.refCanvas}>
      </canvas>
}
