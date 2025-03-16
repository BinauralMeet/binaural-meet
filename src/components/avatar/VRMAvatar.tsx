import * as THREE from 'three'
import {VRM, VRMSchema, VRMUtils} from '@pixiv/three-vrm'
import React, { useEffect, useRef } from 'react'
import { ParticipantBase, VRMRigs } from '@models/Participant'
import { autorun, IReactionDisposer, observable } from 'mobx'
import * as Kalidokit from 'kalidokit'
import Euler from 'kalidokit/dist/utils/euler'
import {GetPromiseGLTFLoader} from '@models/api/GLTF'
import { participants } from '@stores/index'
import { mulV, normV, Pose2DMap, square } from '@models/utils'
import { useObserver } from 'mobx-react-lite'
import { addV, subV } from 'react-use-gesture'

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
  clock: THREE.Clock
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

export const VRMAvatar: React.FC<VRMAvatarProps> = (props: VRMAvatarProps) => {
  const refMem = useRef<Member>({lastLocalOri:0})

  //  3D avatar rendering function
  //  Load avatar and set update autorun when context is updated.
  useEffect(()=>{
    if (!props.refCtx.current) return
    const mem = refMem.current

    //  load VRM
    const loader = GetPromiseGLTFLoader()
    loader.promiseLoad(
        props.participant.information.avatarSrc,
    ).then(gltf => {
      VRMUtils.removeUnnecessaryJoints(gltf.scene);
      VRM.from(gltf).then(vrmGot => {
        mem.vrm = vrmGot
        let head = mem.vrm.scene.getObjectByName('Head')
        if (!head) head = mem.vrm.firstPerson?.firstPersonBone
        if (head){
          const height = head.matrixWorld.elements[13]
          //console.log(`height:${height} head:${head}`)
          mem.vrm.scene.position.y = 0.5 - height
        }
        if (mem.nameLabel && mem.vrm) mem.nameLabel.position.y = -mem.vrm.scene.position.y
        //  Color replace to the avatar color
        if (props.participant.information.avatarSrc==='https://binaural.me/public_packages/uploader/vrm/avatar/256Chinchilla.vrm'){
          const bodyColor = mulV(1.0/255.0, props.participant.getColorRGB())
          const canvas = document.createElement('canvas');
          canvas.width = canvas.height = 256
          const context = canvas.getContext('2d');
          if (context){
            const tex = (mem.vrm.materials![0] as any).map as THREE.Texture
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
      })
    }).catch((e)=>{
      console.log('Failed to load VRM', e)
    })

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
      mem.vrm?.dispose()
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

type HumanoidBoneName = 'Chest'|'Head'|'Hips'|'Jaw'|'LeftEye'|'LeftFoot'|'LeftHand'
  |'LeftIndexDistal'|'LeftIndexIntermediate'|'LeftIndexProximal'|'LeftLittleDistal'
  |'LeftLittleIntermediate'|'LeftLittleProximal'|'LeftLowerArm'|'LeftLowerLeg'
  |'LeftMiddleDistal'|'LeftMiddleIntermediate'|'LeftMiddleProximal'|'LeftRingDistal'
  |'LeftRingIntermediate'|'LeftRingProximal'|'LeftShoulder'|'LeftThumbDistal'
  |'LeftThumbIntermediate'|'LeftThumbProximal'|'LeftToes'|'LeftUpperArm'|'LeftUpperLeg'
  |'Neck'|'RightEye'|'RightFoot'|'RightHand'|'RightIndexDistal'|'RightIndexIntermediate'
  |'RightIndexProximal'|'RightLittleDistal'|'RightLittleIntermediate'|'RightLittleProximal'
  |'RightLowerArm'|'RightLowerLeg'|'RightMiddleDistal'|'RightMiddleIntermediate'
  |'RightMiddleProximal'|'RightRingDistal'|'RightRingIntermediate'|'RightRingProximal'
  |'RightShoulder'|'RightThumbDistal'|'RightThumbIntermediate'|'RightThumbProximal'
  |'RightToes'|'RightUpperArm'|'RightUpperLeg'|'Spine'|'UpperChest'

// Animate Rotation Helper function
const rigRotation = (
  vrm: VRM,
  name: HumanoidBoneName,
  rotation = { x: 0, y: 0, z: 0 },
  dampener = 1,
  lerpAmount = 0.3
) => {
  if (!vrm) {return}
  const Part = vrm.humanoid?.getBoneNode(
    VRMSchema.HumanoidBoneName[name]
  );
  if (!Part) {return}

  let euler = new THREE.Euler(
    rotation.x * dampener,
    rotation.y * dampener,
    rotation.z * dampener
  );
  let quaternion = new THREE.Quaternion().setFromEuler(euler);
  Part.quaternion.slerp(quaternion, lerpAmount); // interpolate
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
    const rot = {x:riggedFace.head.x-0.1, y:riggedFace.head.y, z:riggedFace.head.z}
    //console.log(`rigRot: ${JSON.stringify(rot)}`)
    rigRotation(vrm, "Neck", rot, 0.7);

    // Blendshapes and Preset Name Schema
    const Blendshape = vrm.blendShapeProxy!
    const PresetName = VRMSchema.BlendShapePresetName;

    // Simple example without winking. Interpolate based on old blendshape, then stabilize blink with `Kalidokit` helper function.
    // for VRM, 1 is closed, 0 is open.
    //console.log(`face eye:${riggedFace.eye.l},${riggedFace.eye.r}`)
    const eyeL = clamp(1-riggedFace.eye.l, 0, 1)
    const eyeR = clamp(1-riggedFace.eye.r, 0, 1)
    // riggedFace.eye = Kalidokit.Face.stabilizeBlink(riggedFace.eye, riggedFace.head.y)
    Blendshape.setValue(PresetName.BlinkL, eyeL);
    Blendshape.setValue(PresetName.BlinkR, eyeR);

    // Interpolate and set mouth blendshapes
    Blendshape.setValue(PresetName.I, lerp(riggedFace.mouth.shape.I,Blendshape.getValue(PresetName.I)!, .5));
    Blendshape.setValue(PresetName.A, lerp(riggedFace.mouth.shape.A,Blendshape.getValue(PresetName.A)!, .5));
    Blendshape.setValue(PresetName.E, lerp(riggedFace.mouth.shape.E,Blendshape.getValue(PresetName.E)!, .5));
    Blendshape.setValue(PresetName.O, lerp(riggedFace.mouth.shape.O,Blendshape.getValue(PresetName.O)!, .5));
    Blendshape.setValue(PresetName.U, lerp(riggedFace.mouth.shape.U,Blendshape.getValue(PresetName.U)!, .5));

    //PUPILS
    //interpolate pupil and keep a copy of the value
    let lookTarget =
      new THREE.Euler(
        lerp(oldLookTarget.x , riggedFace.pupil.y, .4),
        lerp(oldLookTarget.y, riggedFace.pupil.x, .4),
        0,
        "XYZ"
      )
    oldLookTarget.copy(lookTarget)
    vrm.lookAt?.applyer?.lookAt(lookTarget);
}

/* VRM Character Animator */
export function vrmSetPose (vrm:VRM, rigs?:VRMRigs){
  if (!vrm) return
  if (!rigs) {
    rigRotation(vrm, "RightUpperArm", new Euler(0,0,-Math.PI/2*0.8), 1, 1);
    rigRotation(vrm, "LeftUpperArm", new Euler(0,0,Math.PI/2*0.8), 1, 1);
    return;
  }

  if (rigs.face) rigFace(vrm, rigs.face)

  // Animate Pose
  if (rigs.pose){
    rigRotation(vrm, "Hips", rigs.pose.Hips.rotation, 0.7);
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
    rigRotation(vrm, "Chest", rigs.pose.Spine, 0.25, .3);
    rigRotation(vrm, "Spine", rigs.pose.Spine, 0.45, .3);

    rigRotation(vrm, "RightUpperArm", rigs.pose.RightUpperArm, 1, .3);
    rigRotation(vrm, "RightLowerArm", rigs.pose.RightLowerArm, 1, .3);
    rigRotation(vrm, "LeftUpperArm", rigs.pose.LeftUpperArm, 1, .3);
    rigRotation(vrm, "LeftLowerArm", rigs.pose.LeftLowerArm, 1, .3);

    rigRotation(vrm, "LeftUpperLeg", rigs.pose.LeftUpperLeg, 1, .3);
    rigRotation(vrm, "LeftLowerLeg", rigs.pose.LeftLowerLeg, 1, .3);
    rigRotation(vrm, "RightUpperLeg", rigs.pose.RightUpperLeg, 1, .3);
    rigRotation(vrm, "RightLowerLeg", rigs.pose.RightLowerLeg, 1, .3);
  }else{
    if (rigs.face){
      //console.log(`head: ${JSON.stringify(rigs.face.head)}`)
      const rot = {x:rigs.face.head.x/3-0.3, y:rigs.face.head.y/2, z:rigs.face.head.z/2}
      rigRotation(vrm, "Chest", rot, 0.25, .3);
      rigRotation(vrm, "Spine", rot, 0.45, .3);
      rigRotation(vrm, "RightUpperArm", {x:-rot.x/4-0.2, y:-rot.y/4, z: -rot.z/4-Math.PI/2*0.8}, 1, 1);
      rigRotation(vrm, "LeftUpperArm", {x:-rot.x/4-0.2, y:-rot.y/4, z: -rot.z/4+Math.PI/2*0.8}, 1, 1);
      rigRotation(vrm, "RightLowerArm", new Euler(0,1.8,-0.3), 1, 1);
      rigRotation(vrm, "LeftLowerArm", new Euler(0,-1.8,0.3), 1, 1);
      rigRotation(vrm, "RightHand", new Euler(-0.4,0.3,-0.3), 1, 1);
      rigRotation(vrm, "LeftHand", new Euler(-0.4,-0.3,0.3), 1, 1);
      }
  }

  // Animate Hands
  if (rigs.pose && rigs.leftHand){
    rigRotation(vrm, "LeftHand", {
      // Combine pose rotation Z and hand rotation X Y
      z: rigs.pose.LeftHand.z,
      y: rigs.leftHand.LeftWrist.y,
      x: rigs.leftHand.LeftWrist.x
    })
  }
  if (rigs?.leftHand){
    rigRotation(vrm, "LeftRingProximal", rigs.leftHand.LeftRingProximal);
    rigRotation(vrm, "LeftRingIntermediate", rigs.leftHand.LeftRingIntermediate);
    rigRotation(vrm, "LeftRingDistal", rigs.leftHand.LeftRingDistal);
    rigRotation(vrm, "LeftIndexProximal", rigs.leftHand.LeftIndexProximal);
    rigRotation(vrm, "LeftIndexIntermediate", rigs.leftHand.LeftIndexIntermediate);
    rigRotation(vrm, "LeftIndexDistal", rigs.leftHand.LeftIndexDistal);
    rigRotation(vrm, "LeftMiddleProximal", rigs.leftHand.LeftMiddleProximal);
    rigRotation(vrm, "LeftMiddleIntermediate", rigs.leftHand.LeftMiddleIntermediate);
    rigRotation(vrm, "LeftMiddleDistal", rigs.leftHand.LeftMiddleDistal);
    rigRotation(vrm, "LeftThumbProximal", rigs.leftHand.LeftThumbProximal);
    rigRotation(vrm, "LeftThumbIntermediate", rigs.leftHand.LeftThumbIntermediate);
    rigRotation(vrm, "LeftThumbDistal", rigs.leftHand.LeftThumbDistal);
    rigRotation(vrm, "LeftLittleProximal", rigs.leftHand.LeftLittleProximal);
    rigRotation(vrm, "LeftLittleIntermediate", rigs.leftHand.LeftLittleIntermediate);
    rigRotation(vrm, "LeftLittleDistal", rigs.leftHand.LeftLittleDistal);
  }
  if (rigs.pose && rigs.rightHand){
    rigRotation(vrm, "RightHand", {
      // Combine Z axis from pose hand and X/Y axis from hand wrist rotation
      z: rigs.pose.RightHand.z,
      y: rigs.rightHand.RightWrist.y,
      x: rigs.rightHand.RightWrist.x
    })
  }
  if (rigs.rightHand){
    rigRotation(vrm, "RightRingProximal", rigs.rightHand.RightRingProximal);
    rigRotation(vrm, "RightRingIntermediate", rigs.rightHand.RightRingIntermediate);
    rigRotation(vrm, "RightRingDistal", rigs.rightHand.RightRingDistal);
    rigRotation(vrm, "RightIndexProximal", rigs.rightHand.RightIndexProximal);
    rigRotation(vrm, "RightIndexIntermediate",rigs.rightHand.RightIndexIntermediate);
    rigRotation(vrm, "RightIndexDistal", rigs.rightHand.RightIndexDistal);
    rigRotation(vrm, "RightMiddleProximal", rigs.rightHand.RightMiddleProximal);
    rigRotation(vrm, "RightMiddleIntermediate", rigs.rightHand.RightMiddleIntermediate);
    rigRotation(vrm, "RightMiddleDistal", rigs.rightHand.RightMiddleDistal);
    rigRotation(vrm, "RightThumbProximal", rigs.rightHand.RightThumbProximal);
    rigRotation(vrm, "RightThumbIntermediate", rigs.rightHand.RightThumbIntermediate);
    rigRotation(vrm, "RightThumbDistal", rigs.rightHand.RightThumbDistal);
    rigRotation(vrm, "RightLittleProximal", rigs.rightHand.RightLittleProximal);
    rigRotation(vrm, "RightLittleIntermediate", rigs.rightHand.RightLittleIntermediate);
    rigRotation(vrm, "RightLittleDistal", rigs.rightHand.RightLittleDistal);
  }
  vrm.blendShapeProxy?.update()
};
