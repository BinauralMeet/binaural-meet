import { AllLandmarks, ParticipantBase, VRMRigs} from '@models/Participant'
import { mulV, normV} from './coordinates'
import { VRM, VRMExpressionPresetName, VRMHumanBoneName, VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { addV, subV } from 'react-use-gesture'
import * as Kalidokit from 'kalidokit'
import Euler from 'kalidokit/dist/utils/euler'
import { IReactionDisposer } from 'mobx'
import { createStrcture3DEx, drawFikStructure, Structure3DEx, updateStructure3DEx } from './vrmIK'

declare const d:any                  //  from index.html


export interface VRMAvatar{
  participant: ParticipantBase
  vrm: VRM
  nameLabel?:THREE.Sprite
  dispo?: IReactionDisposer
  structure?: Structure3DEx
}
export interface VRMAvatars{
  remotes: Map<string, VRMAvatar>
  local?: VRMAvatar
//  offscreen: THREE.WebGLRenderTarget
//  selfSprite: THREE.Sprite
//  mirrorSprite: THREE.Sprite
//  onscreen?: THREE.WebGLRenderTarget
//  scene: THREE.Scene
}

export function createVRMAvatars(){
  const vrmAvatars:VRMAvatars = {
    remotes: new Map<string, VRMAvatar>(),
  }
  d.vrmAvatars = vrmAvatars
  return vrmAvatars
}

function getVRMLoader() {
  const loader = new GLTFLoader()
  loader.register((parser) => {
    return new VRMLoaderPlugin(parser)
  });
  return loader;
}

export function removeVrmAvatar(vas:VRMAvatars, isLocal:boolean, pid?: string){
  if (isLocal){
    if (vas.local) {
      disposeVrmAvatar(vas.local)
      delete vas.local
    }
  }
  else{
    const remote = vas.remotes.get(pid!)
    if (remote){
      disposeVrmAvatar(remote)
      vas.remotes.delete(pid!)
    }
  }
}
function disposeVrmAvatar(avatar: VRMAvatar){
  if (avatar.dispo) avatar.dispo()
  delete avatar.dispo
  freeVrmAvatar(avatar)
}
export function freeVrmAvatar(avatar: VRMAvatar){
  avatar.vrm.scene.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.geometry.dispose()
      if (Array.isArray(obj.material)) {
        obj.material.forEach(mat => mat.dispose())
      } else {
        obj.material.dispose()
      }
    }
  })
  avatar.nameLabel?.material.map?.dispose()
  avatar.nameLabel?.material.dispose()
  avatar.nameLabel?.geometry.dispose()
  delete avatar.nameLabel
}

export function createVrmAvatar(participant: ParticipantBase){
  const promise = new Promise<VRMAvatar>((resolve, reject)=>{
    loadVrmAvatar(participant).then((vrm)=>{
      const hand = vrm.humanoid.getNormalizedBoneNode('rightHand')
      if (hand){
        const sphereG = new THREE.SphereGeometry(0.03, 4, 4);
        const coneG = new THREE.ConeGeometry(0.03, 0.08, 4);
        const materialW = new THREE.MeshBasicMaterial( {color: 0x00AAAAAA} );
        const materialG = new THREE.MeshBasicMaterial( {color: 0x0000FF00} );
        const materialR = new THREE.MeshBasicMaterial( {color: 0x00FF0000} );
        const materialB = new THREE.MeshBasicMaterial( {color: 0x000000FF} );
        let sphere = new THREE.Mesh(sphereG, materialW)
        hand.add(sphere);
        let cone = new THREE.Mesh(coneG, materialR);
        cone.translateX(0.1)
        cone.rotateZ(-0.5*Math.PI)
        hand.add(cone);
        cone = new THREE.Mesh(coneG, materialG);
        cone.translateY(0.1)
        hand.add(cone);
        cone = new THREE.Mesh(coneG, materialB);
        cone.translateZ(0.1)
        cone.rotateX(0.5*Math.PI)
        hand.add(cone);
      }

      const avatar:VRMAvatar = {
        vrm,
        nameLabel: createNameLabel(participant),
        participant,
      }
      if (avatar.nameLabel){
        avatar.nameLabel.position.y = -avatar.vrm.scene.position.y
      }
      //  console.log(`avatar for ${participant.id} loaded.`)
      resolve(avatar)
    })
  })
  return promise
}

function fillRoundedRect(vas:CanvasRenderingContext2D, x:number, y:number, width:number, height:number, radius:number) {
  vas.beginPath();
  vas.moveTo(x, y + radius);
  vas.arcTo(x, y + height, x + radius, y + height, radius);
  vas.arcTo(x + width, y + height, x + width, y + height - radius, radius);
  vas.arcTo(x + width, y, x + width - radius, y, radius);
  vas.arcTo(x, y, x, y + radius, radius);
  vas.fill();
}

function createNameLabel(participant: ParticipantBase): THREE.Sprite|undefined{
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

let loader: GLTFLoader
function loadVrmAvatar(participant: ParticipantBase){
  const promise = new Promise<VRM>((resolve, reject)=>{
    if (!loader) loader = getVRMLoader()
    loader.load(
      participant.information.avatarSrc,
      (gltf) => {
        const vrm = gltf.userData.vrm as VRM
        if (!vrm) return;
        VRMUtils.combineSkeletons(vrm.scene)
        let head = vrm.scene.getObjectByName('Head')
        const firstPersonBone = vrm.humanoid?.getNormalizedBoneNode('head');
        if (!head && firstPersonBone) head = firstPersonBone;
        if (head){
          const height = head.matrixWorld.elements[13]
          //console.log(`height:${height} head:${head}`)
          vrm.scene.position.y = 0.5 - height
        }
        //  Color replace to the avatar color
        if (participant.information.avatarSrc==='https://binaural.me/public_packages/uploader/vrm/avatar/256Chinchilla.vrm'){
          const bodyColor = mulV(1.0/255.0, participant.getColorRGB())
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
        resolve(vrm)
      },
    )
  })
  return promise
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
function vrmSetFaceRig(vrm:VRM, riggedFace:Kalidokit.TFace){
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
export function vrmSetPose (avatar:VRMAvatar, landmarks: AllLandmarks|undefined, c2d?: CanvasRenderingContext2D){
  if (!avatar.vrm) return
  //if (avatar.participant.vrmRigs?.face) vrmSetFaceRig(avatar.vrm, avatar.participant.vrmRigs.face)
  if (landmarks){
    if (!avatar.structure){
      avatar.structure = createStrcture3DEx(avatar.vrm)
    }
    updateStructure3DEx(avatar.vrm, avatar.structure, landmarks)
    if (c2d){
      drawFikStructure(avatar.structure, landmarks, c2d)
    }
  }
  else if (!avatar.participant.vrmRigs) {
    rigRotation(avatar.vrm, "rightUpperArm", new Euler(0,0,-Math.PI/2*0.8), 1, 1);
    rigRotation(avatar.vrm, "leftUpperArm", new Euler(0,0,Math.PI/2*0.8), 1, 1);
    return;
  }
}
/*
  // Animate Pose
  if (rigs.pose){
    const rotHip = {...rigs.pose.Hips.rotation!}
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
/*
  const rotSpine = {...rigs.pose.Spine!}
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
/*  }else{
    if (rigs.face){
      //console.log(`head: ${JSON.stringify(rigs.face.head)}`)
      const rot = {x:rigs.face.head.x/3-0.3, y:-rigs.face.head.y, z:-rigs.face.head.z}
      rigRotation(vrm, "hips", rot, 0.7);
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
  //*
  console.log(`rightHand: ${JSON.stringify(rigs.leftHand.LeftWrist)}`)
  rigRotation(vrm, "rightHand", {
      // Combine pose rotation Z and hand rotation X Y
      x: 0, //rigs.leftHand.LeftWrist.x,  //  axis around thumb to ring
      y: 0,//rigs.leftHand.LeftWrist.x, //rigs.leftHand.LeftWrist.y,// *3 + Math.PI/3,  //  y does not work well
      z: 0,// -rigs.leftHand.LeftWrist.x*3 //  rot around middle finger
    })  //  */
  /*
  }
  if (rigs?.leftHand){
    rigRotation(vrm, "rightRingProximal", rigs.leftHand.LeftRingProximal);
    rigRotation(vrm, "rightRingIntermediate", rigs.leftHand.LeftRingIntermediate);
    rigRotation(vrm, "rightRingDistal", rigs.leftHand.LeftRingDistal);
    rigRotation(vrm, "rightIndexProximal", rigs.leftHand.LeftIndexProximal);
    rigRotation(vrm, "rightIndexIntermediate", rigs.leftHand.LeftIndexIntermediate);
    rigRotation(vrm, "rightIndexDistal", rigs.leftHand.LeftIndexDistal);
    rigRotation(vrm, "rightMiddleProximal", rigs.leftHand.LeftMiddleProximal);
    rigRotation(vrm, "rightMiddleIntermediate", rigs.leftHand.LeftMiddleIntermediate);
    rigRotation(vrm, "rightMiddleDistal", rigs.leftHand.LeftMiddleDistal);
    rigRotation(vrm, "rightThumbProximal", rigs.leftHand.LeftThumbProximal);
    rigRotation(vrm, "rightThumbDistal", rigs.leftHand.LeftThumbDistal);
    rigRotation(vrm, "rightLittleProximal", rigs.leftHand.LeftLittleProximal);
    rigRotation(vrm, "rightLittleIntermediate", rigs.leftHand.LeftLittleIntermediate);
    rigRotation(vrm, "rightLittleDistal", rigs.leftHand.LeftLittleDistal);
  }
  if (false && rigs.pose && rigs.rightHand){
    rigRotation(vrm, "leftHand", {
      // Combine Z axis from pose hand and X/Y axis from hand wrist rotation
      z: -rigs.rightHand.RightWrist.y - Math.PI/4,  //  axis around thumb to ring
      y: -rigs.pose.RightHand.y*3,  //  y does not work well
      x: -rigs.rightHand.RightWrist.x*3 //  rot around middle finger
    })
  }
  if (false && rigs.rightHand){
    rigRotation(vrm, "leftRingProximal", rigs.rightHand.RightRingProximal);
    rigRotation(vrm, "leftRingIntermediate", rigs.rightHand.RightRingIntermediate);
    rigRotation(vrm, "leftRingDistal", rigs.rightHand.RightRingDistal);
    const rot = {...rigs.rightHand.RightIndexDistal}
    rot.x *= -1
    rigRotation(vrm, "leftIndexProximal", rot);
    rigRotation(vrm, "leftIndexIntermediate",rot);
    rigRotation(vrm, "leftIndexDistal", rot);
/*
    rigRotation(vrm, "leftIndexProximal", rigs.rightHand.RightIndexProximal);
    rigRotation(vrm, "leftIndexIntermediate",rigs.rightHand.RightIndexIntermediate);
    rigRotation(vrm, "leftIndexDistal", rigs.rightHand.RightIndexDistal);
*/
/*    rigRotation(vrm, "leftMiddleProximal", rigs.rightHand.RightMiddleProximal);
    rigRotation(vrm, "leftMiddleIntermediate", rigs.rightHand.RightMiddleIntermediate);
    rigRotation(vrm, "leftMiddleDistal", rigs.rightHand.RightMiddleDistal);
    rigRotation(vrm, "leftThumbProximal", rigs.rightHand.RightThumbProximal);
    rigRotation(vrm, "leftThumbDistal", rigs.rightHand.RightThumbDistal);
    rigRotation(vrm, "leftLittleProximal", rigs.rightHand.RightLittleProximal);
    rigRotation(vrm, "leftLittleIntermediate", rigs.rightHand.RightLittleIntermediate);
    rigRotation(vrm, "leftLittleDistal", rigs.rightHand.RightLittleDistal);
  }
  vrm.expressionManager?.update()
};
*/
