import * as THREE from 'three'
import {VRM, VRMHumanBoneName, VRMLoaderPlugin, VRMUtils} from '@pixiv/three-vrm'
import React, { useEffect, useRef } from 'react'
import { ParticipantBase, VRMRigs } from '@models/Participant'
import { autorun, IReactionDisposer } from 'mobx'
import * as Kalidokit from 'kalidokit'
import Euler from 'kalidokit/dist/utils/euler'
import { participants } from '@stores/index'
import { mulV, normV, Pose2DMap } from '@models/utils'
import { addV, subV } from 'react-use-gesture'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { VRMExpressionPresetName } from '@pixiv/three-vrm'

export interface VRMUpdateReq{
  participant: ParticipantBase
  pose: Pose2DMap
  vrm: VRM
  nameLabel?:THREE.Sprite
  rig?: VRMRigs
  //  used in WebGLCanvas
  rendered?: boolean
  dist?: number
  dir?: number
  ori?: number
}
export interface ThreeContext{
  canvas: HTMLCanvasElement
  offscreen: THREE.WebGLRenderTarget
  selfSprite: THREE.Sprite
  mirrorSprite: THREE.Sprite
  onscreen: THREE.WebGLRenderTarget
  renderer: THREE.WebGLRenderer
  scene: THREE.Scene
  remotes: Map<string, VRMUpdateReq>
  local?: VRMUpdateReq
}

export interface VRMAvatarProps{
  participant:ParticipantBase
  refCtx: React.RefObject<ThreeContext>
}

interface Member{
  vrm?: VRM
  nameLabel?:THREE.Sprite
  dispo?:IReactionDisposer
  lastLocalOri:number
}

function updateRequest(props: VRMAvatarProps, mem: Member){
  const ctx = props.refCtx.current
  if (!mem.vrm || !ctx) return
  const req:VRMUpdateReq = {
    participant: props.participant,
    pose: props.participant.pose,
    vrm: mem.vrm,
    nameLabel: mem.nameLabel,
    rig: props.participant.vrmRigs
  }
  if (props.participant.id === participants.localId){
    ctx.local = req
  }else{
    ctx.remotes?.set(props.participant.id, req)
  }
  //console.log(`updateRequest called req: ${props.refCtx.current?.updateReqs?.size}`)
}
function fillRoundedRect(ctx:CanvasRenderingContext2D, x:number, y:number, width:number, height:number, radius:number) {
  ctx.beginPath();
  ctx.moveTo(x, y + radius);
  ctx.arcTo(x, y + height, x + radius, y + height, radius);
  ctx.arcTo(x + width, y + height, x + width, y + height - radius, radius);
  ctx.arcTo(x + width, y, x + width - radius, y, radius);
  ctx.arcTo(x, y, x, y + radius, radius);
  ctx.fill();
}

function createNameLabel(participant: ParticipantBase) {
  const colors = participant.getColor()
  const fontSize = 30;
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) return undefined
  context.font = `${fontSize}px Arial`;
  const textSize = context.measureText(participant.information.name)
  canvas.width = textSize.width + 8
  canvas.height = (fontSize + 8)
  //console.log(`w: ${canvas.width} h:${canvas.height} `)
  context.fillStyle = colors[0]
  fillRoundedRect(context, 0, 0, canvas.width, canvas.height, 8)
  context .fillStyle = colors[1]
  context.font = `${fontSize}px Arial`
  context.fillText(participant.information.name, 4, canvas.height-8, canvas.width)
  const texture = new THREE.CanvasTexture(canvas)
  const material = new THREE.SpriteMaterial({ map: texture , depthTest:false})
  const sprite = new THREE.Sprite(material)
  const scale = 0.15
  sprite.scale.set(canvas.width/canvas.height*scale, scale, 1)
  return sprite
}

function getVRMLoader() {
  const loader = new GLTFLoader()
  loader.register((parser) => {
    return new VRMLoaderPlugin(parser)
  });
  return loader;
}

export const VRMAvatar: React.FC<VRMAvatarProps> = (props: VRMAvatarProps) => {
  const refMem = useRef<Member>({lastLocalOri:0})

  //  3D avatar rendering function
  //  Load avatar and set update autorun when context is updated.
  useEffect(()=>{
    if (!props.refCtx.current) return
    const mem = refMem.current

    //  load VRM
    const loader = getVRMLoader()
    loader.load(
      props.participant.information.avatarSrc,
      (gltf) => {
        const vrm = gltf.userData.vrm as VRM
        if (!vrm) return;
        VRMUtils.combineSkeletons(vrm.scene)
        mem.vrm = vrm
        let head = vrm.scene.getObjectByName('Head')
        const firstPersonBone = vrm.humanoid?.getNormalizedBoneNode('head');
        if (!head && firstPersonBone) head = firstPersonBone;
        if (head){
          const height = head.matrixWorld.elements[13]
          //console.log(`height:${height} head:${head}`)
          vrm.scene.position.y = 0.5 - height
        }
        if (mem.nameLabel && vrm) mem.nameLabel.position.y = -vrm.scene.position.y
        //  Color replace to the avatar color
        if (props.participant.information.avatarSrc==='https://binaural.me/public_packages/uploader/vrm/avatar/256Chinchilla.vrm'){
          const bodyColor = mulV(1.0/255.0, props.participant.getColorRGB())
          const canvas = document.createElement('canvas');
          canvas.width = canvas.height = 256
          const context = canvas.getContext('2d');
          if (context){
            const tex = (vrm.materials![0] as any).map as THREE.Texture
            context.drawImage(tex.image, 0, 0)
            const image = context.getImageData(0,0, 256,256)
            const base = [0.5, 0.5, 0.5]
            const baseLen = normV(base)
            for (let i=0; i<256*256; ++i){
              const color = [image.data[i*4]/255.0, image.data[i*4+1]/255.0, image.data[i*4+2]/255.0]
              const dist = normV(subV(color, base))
              const near = baseLen - dist
              const baseColor = subV(color, mulV(near, base))
              const newColor = addV(baseColor, mulV(near, bodyColor))
              //if (i===0) console.log(`baseColor:${baseColor[0]} newColor:${newColor[0]}`)
              for(let ci=0; ci<3;++ci){
                newColor[ci] = Math.min(Math.max(0, newColor[ci]), 1)
                image.data[i*4+ci] = newColor[ci]*255
              }
            }
            createImageBitmap(image).then((bitmap)=>{
              tex.image = bitmap
            })
          }
        }
        //  console.log(`VRM loaded for ${props.participant.id}`)
        //  set autorun
        if (mem.dispo){ mem.dispo() }
        mem.dispo = autorun(()=>{ //  Request update when orientation or rigs changed.
          updateRequest(props, mem)
        })
      },
      undefined,
      (error) => {
        console.log('Failed to load VRM', error)
      }
    )

    return ()=>{
      //console.log(`Unmount VRMAvatar for ${props.participant.id}`)
      const ctx = props.refCtx.current
      if (ctx){
        if (props.participant.id === participants.localId){
          delete ctx.local
        }else{
          ctx.remotes.delete(props.participant.id)
        }
      }
      if (mem.dispo) mem.dispo()
      if (mem.vrm) {
        mem.vrm.scene.traverse((obj) => {
          if (obj instanceof THREE.Mesh) {
            obj.geometry.dispose()
            if (Array.isArray(obj.material)) {
              obj.material.forEach(mat => mat.dispose())
            } else {
              obj.material.dispose()
            }
          }
        })
      }
      delete mem.vrm
      mem.nameLabel?.material.map?.dispose()
      mem.nameLabel?.material.dispose()
      mem.nameLabel?.geometry.dispose()
      delete mem.nameLabel
    }
  }, [props.refCtx.current, props.participant.information.avatarSrc]) //  reload vrm when ctx or avatarSrc changed.

  //  Create name label for 3D avatar
  useEffect(()=>{
    if (!props.refCtx.current) return
    const mem = refMem.current
    mem.nameLabel = createNameLabel(props.participant)
    if (mem.nameLabel && mem.vrm) mem.nameLabel.position.y = -mem.vrm.scene.position.y
    updateRequest(props, mem)

    return ()=>{
      mem.nameLabel?.material.map?.dispose()
      mem.nameLabel?.material.dispose()
      mem.nameLabel?.geometry.dispose()
      delete mem.nameLabel
    }
  }, [props.refCtx.current, ...props.participant.information.textColor,
    ...props.participant.information.color, props.participant.information.name]) //  reload name or color changed.

  return <></>
}


const clamp = Kalidokit.Utils.clamp;
const lerp = Kalidokit.Vector.lerp;

// Animate Rotation Helper function
const rigRotation = (
  vrm: VRM,
  name: VRMHumanBoneName,
  rotation = { x: 0, y: 0, z: 0 },
  dampener = 1,
  lerpAmount = 0.3
) => {
  if (!vrm) { return }
  const humanoid = vrm.humanoid;
  if (!humanoid) { return }

  const bone = humanoid.getNormalizedBoneNode(name);
  if (!bone) { return }

  const euler = new THREE.Euler(
    rotation.x * dampener,
    rotation.y * dampener,
    rotation.z * dampener
  );
  const quaternion = new THREE.Quaternion().setFromEuler(euler);
  bone.quaternion.slerp(quaternion, lerpAmount);
};

/*  // Animate Position Helper Function
const rigPosition = (vrm: VRM,
  name:HumanoidBoneName,
  position = { x: 0, y: 0, z: 0 },
  dampener = 1,
  lerpAmount = 0.3
) => {
  if (!vrm) {return}
  const Part = vrm.humanoid?.getBoneNode(
    VRMSchema.HumanoidBoneName[name]
  );
  if (!Part) {return}
  let vector = new THREE.Vector3(
    position.x * dampener,
    position.y * dampener,
    position.z * dampener
  );
  Part.position.lerp(vector, lerpAmount); // interpolate
};  */

let oldLookTarget = new THREE.Euler()
function rigFace(vrm:VRM, riggedFace:Kalidokit.TFace){
    if(!vrm){return}
    const rot = {x:riggedFace.head.x-0.1, y:-riggedFace.head.y, z:-riggedFace.head.z}
    //console.log(`rigRot: ${JSON.stringify(rot)}`)
    rigRotation(vrm, "neck", rot, 0.7);

    // Blendshapes and Preset Name Schema
    const Blendshape = vrm.expressionManager!
    const PresetName = VRMExpressionPresetName;

    // Simple example without winking. Interpolate based on old blendshape, then stabilize blink with `Kalidokit` helper function.
    // for VRM, 1 is closed, 0 is open.
    //console.log(`face eye:${riggedFace.eye.l},${riggedFace.eye.r}`)
    const eyeL = clamp(1-riggedFace.eye.l, 0, 1)
    const eyeR = clamp(1-riggedFace.eye.r, 0, 1)
    Blendshape.setValue(PresetName.BlinkLeft, eyeR);
    Blendshape.setValue(PresetName.BlinkRight, eyeL);

    // Interpolate and set mouth blendshapes
    Blendshape.setValue(PresetName.Ih, lerp(riggedFace.mouth.shape.I,Blendshape.getValue(PresetName.Ih)!, .5));
    Blendshape.setValue(PresetName.Aa, lerp(riggedFace.mouth.shape.A,Blendshape.getValue(PresetName.Aa)!, .5));
    Blendshape.setValue(PresetName.Ee, lerp(riggedFace.mouth.shape.E,Blendshape.getValue(PresetName.Ee)!, .5));
    Blendshape.setValue(PresetName.Oh, lerp(riggedFace.mouth.shape.O,Blendshape.getValue(PresetName.Oh)!, .5));
    Blendshape.setValue(PresetName.Ou, lerp(riggedFace.mouth.shape.U,Blendshape.getValue(PresetName.Ou)!, .5));

    //PUPILS
    //interpolate pupil and keep a copy of the value
    let lookTarget =
      new THREE.Euler(
        lerp(-oldLookTarget.x , riggedFace.pupil.y, .4),
        lerp(oldLookTarget.y, riggedFace.pupil.x, .4),
        0,
        "XYZ"
      )
    oldLookTarget.copy(lookTarget)
    vrm.lookAt?.applier?.applyYawPitch(lookTarget.y, lookTarget.x)
    //vrm.lookAt?.applier?.lookAt(lookTarget);
}

/* VRM Character Animator */
export function vrmSetPose (vrm:VRM, rigs?:VRMRigs){
  if (!vrm) return
  if (!rigs) {
    rigRotation(vrm, "rightUpperArm", new Euler(0,0,-Math.PI/2*0.8), 1, 1);
    rigRotation(vrm, "leftUpperArm", new Euler(0,0,Math.PI/2*0.8), 1, 1);
    return;
  }

  if (rigs.face) rigFace(vrm, rigs.face)

  // Animate Pose
  if (rigs.pose){
    const rotHip = rigs.pose.Hips.rotation!
    rotHip.z *= -1
    rotHip.y *= -1
    rigRotation(vrm, "hips", rotHip, 0.7);
/*    rigPosition(vrm,
      "Hips",
      {
        x: -rigs.pose.Hips.position.x, // Reverse direction
        y: rigs.pose.Hips.position.y + 1, // Add a bit of height
        z: -rigs.pose.Hips.position.z // Reverse direction
      },
      1,
      0.07
    );
*/
    const rotSpine = rigs.pose.Spine!
    rotSpine.z *= -1
    rotSpine.y *= -1
    rigRotation(vrm, "chest", rotSpine, 0.25, .3);
    rigRotation(vrm, "spine", rotSpine, 0.45, .3);

    //  Cancel mirror
    const rua = {...rigs.pose.RightUpperArm}
    rua.y *= -1
    rua.z *= -1
    const rla = {...rigs.pose.RightLowerArm}
    rla.y *= -1
    rla.z *= -1
    const lua = {...rigs.pose.LeftUpperArm}
    lua.y *= -1
    lua.z *= -1
    const lla = {...rigs.pose.LeftLowerArm}
    lla.y *= -1
    lla.z *= -1
    rigRotation(vrm, "leftUpperArm", rua, 1, .3);
    rigRotation(vrm, "leftLowerArm", rla, 1, .3);
    rigRotation(vrm, "rightUpperArm", lua, 1, .3);
    rigRotation(vrm, "rightLowerArm", lla, 1, .3);

/*  TODO: Legs also need to reversed.
    rigRotation(vrm, "leftUpperLeg", rigs.pose.RightUpperLeg, 1, .3);
    rigRotation(vrm, "leftLowerLeg", rigs.pose.RightLowerLeg, 1, .3);
    rigRotation(vrm, "rightUpperLeg", rigs.pose.LeftUpperLeg, 1, .3);
    rigRotation(vrm, "rightLowerLeg", rigs.pose.LeftLowerLeg, 1, .3);
    */
  }else{
    if (rigs.face){
      //console.log(`head: ${JSON.stringify(rigs.face.head)}`)
      const rot = {x:rigs.face.head.x/3-0.3, y:rigs.face.head.y/2, z:rigs.face.head.z/2}
      rigRotation(vrm, "chest", rot, 0.25, .3);
      rigRotation(vrm, "spine", rot, 0.45, .3);
      rigRotation(vrm, "rightUpperArm", {x:-rot.x/4-0.2, y:-rot.y/4, z: -rot.z/4-Math.PI/2*0.8}, 1, 1);
      rigRotation(vrm, "leftUpperArm", {x:-rot.x/4-0.2, y:-rot.y/4, z: -rot.z/4+Math.PI/2*0.8}, 1, 1);
      rigRotation(vrm, "rightLowerArm", new Euler(0,1.8,-0.3), 1, 1);
      rigRotation(vrm, "leftLowerArm", new Euler(0,-1.8,0.3), 1, 1);
      rigRotation(vrm, "rightHand", new Euler(-0.4,0.3,-0.3), 1, 1);
      rigRotation(vrm, "leftHand", new Euler(-0.4,-0.3,0.3), 1, 1);
      }
  }

  // Animate Hands
  if (rigs.pose && rigs.leftHand){
    rigRotation(vrm, "rightHand", {
      // Combine pose rotation Z and hand rotation X Y
      z: -rigs.leftHand.LeftWrist.y - Math.PI/4,  //  axis around thumb to ring
      y: -rigs.pose.LeftHand.y*3,  //  y does not work well
      x: -rigs.leftHand.LeftWrist.x*3 //  rot around middle finger
    })
  }
  if (rigs?.leftHand){
    rigRotation(vrm, "leftRingProximal", rigs.leftHand.LeftRingProximal);
    rigRotation(vrm, "leftRingIntermediate", rigs.leftHand.LeftRingIntermediate);
    rigRotation(vrm, "leftRingDistal", rigs.leftHand.LeftRingDistal);
    rigRotation(vrm, "leftIndexProximal", rigs.leftHand.LeftIndexProximal);
    rigRotation(vrm, "leftIndexIntermediate", rigs.leftHand.LeftIndexIntermediate);
    rigRotation(vrm, "leftIndexDistal", rigs.leftHand.LeftIndexDistal);
    rigRotation(vrm, "leftMiddleProximal", rigs.leftHand.LeftMiddleProximal);
    rigRotation(vrm, "leftMiddleIntermediate", rigs.leftHand.LeftMiddleIntermediate);
    rigRotation(vrm, "leftMiddleDistal", rigs.leftHand.LeftMiddleDistal);
    rigRotation(vrm, "leftThumbProximal", rigs.leftHand.LeftThumbProximal);
    rigRotation(vrm, "leftThumbDistal", rigs.leftHand.LeftThumbDistal);
    rigRotation(vrm, "leftLittleProximal", rigs.leftHand.LeftLittleProximal);
    rigRotation(vrm, "leftLittleIntermediate", rigs.leftHand.LeftLittleIntermediate);
    rigRotation(vrm, "leftLittleDistal", rigs.leftHand.LeftLittleDistal);
  }
  if (rigs.pose && rigs.rightHand){
    rigRotation(vrm, "rightHand", {
      // Combine Z axis from pose hand and X/Y axis from hand wrist rotation
      z: -rigs.rightHand.RightWrist.y - Math.PI/4,  //  axis around thumb to ring
      y: -rigs.pose.RightHand.y*3,  //  y does not work well
      x: -rigs.rightHand.RightWrist.x*3 //  rot around middle finger
    })
  }
  if (rigs.rightHand){
    rigRotation(vrm, "rightRingProximal", rigs.rightHand.RightRingProximal);
    rigRotation(vrm, "rightRingIntermediate", rigs.rightHand.RightRingIntermediate);
    rigRotation(vrm, "rightRingDistal", rigs.rightHand.RightRingDistal);
    rigRotation(vrm, "rightIndexProximal", rigs.rightHand.RightIndexProximal);
    rigRotation(vrm, "rightIndexIntermediate",rigs.rightHand.RightIndexIntermediate);
    rigRotation(vrm, "rightIndexDistal", rigs.rightHand.RightIndexDistal);
    rigRotation(vrm, "rightMiddleProximal", rigs.rightHand.RightMiddleProximal);
    rigRotation(vrm, "rightMiddleIntermediate", rigs.rightHand.RightMiddleIntermediate);
    rigRotation(vrm, "rightMiddleDistal", rigs.rightHand.RightMiddleDistal);
    rigRotation(vrm, "rightThumbProximal", rigs.rightHand.RightThumbProximal);
    rigRotation(vrm, "rightThumbDistal", rigs.rightHand.RightThumbDistal);
    rigRotation(vrm, "rightLittleProximal", rigs.rightHand.RightLittleProximal);
    rigRotation(vrm, "rightLittleIntermediate", rigs.rightHand.RightLittleIntermediate);
    rigRotation(vrm, "rightLittleDistal", rigs.rightHand.RightLittleDistal);
  }
  vrm.expressionManager?.update()
};
