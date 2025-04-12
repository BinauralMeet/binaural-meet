import {GpuBuffer, LandmarkList, NormalizedLandmarkList} from '@mediapipe/holistic'
import * as THREE from 'three';
import { VRM, VRMExpressionPresetName, VRMHumanBoneName } from '@pixiv/three-vrm'
import * as FIK from 'fullik';
import * as Kalidokit from 'kalidokit'
import {square} from './coordinates';
import {VRMAvatar} from './vrm';

export interface AllLandmarks{
  faceLm?: NormalizedLandmarkList
  poseLm?: NormalizedLandmarkList
  poseLm3d?: NormalizedLandmarkList
  leftHandLm?: NormalizedLandmarkList
  rightHandLm?: NormalizedLandmarkList
  image?: GpuBuffer
}

export interface FikStructure3DEx extends FIK.Structure3D{
  hips?: {Hips: Kalidokit.IHips, Spine: Kalidokit.XYZ}
  face?: Kalidokit.TFace
  lengthsList:number[][]
  vrmHandToHandLength:number
  scale: number
  mrHeadInv: THREE.Matrix4    //  rotation from transp of hip to head.
  m4wHipsInv: THREE.Matrix4      //  inverse of hips's world rotation
  hHeadTohLm: THREE.Vector3
}

interface XYZ {
  x:number,
  y:number,
  z:number
}

//  Utils for matrix4
function removeTranslateion(m: THREE.Matrix4){
  m.elements[12] = 0
  m.elements[13] = 0
  m.elements[14] = 0
}
function getTranslation(from: THREE.Matrix4){
  return new THREE.Vector3(from.elements[12], from.elements[13], from.elements[14])
}

//  Utils
function printV3(v?:XYZ){
  if(v) return `(${v.x.toFixed(2)} ${v.y.toFixed(2)} ${v.z.toFixed(2)})`
  else `(${v})`
}
let printCount = 0

/// Scale a media pipe landmark.
function scaleLm(v:XYZ, s:FikStructure3DEx) {
  return new THREE.Vector3(-v.x*s.scale, -v.y*s.scale, v.z*s.scale)
}
/// Convert a media pipe landmark into VRM's Head local coordinates.
function mp2VrmV3(v:XYZ, s:FikStructure3DEx){  //  Convert into VRM = OpenGL coordinates.
  const cooked = scaleLm(v, s)
  cooked.applyMatrix4(s.mrHeadInv) //  rotated
  cooked.sub(s.hHeadTohLm)
  return cooked
}

// Set rotation to a bone
function rigRotation(
  vrm: VRM,
  name: VRMHumanBoneName,
  rotation = { x: 0, y: 0, z: 0 },
  dampener = 1,
  lerpAmount = 0.3
){
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
}


//---------------------------------------------------------------------------
//  Canvas 2D Drawing related functions:
function getInterpolatedColor(ratio: number, colors:number[][]){
  return colors[0].map((el, j)=> ratio * el + (1-ratio)*colors[1][j])
}
function scaleAndCenter(c2d: CanvasRenderingContext2D, z:boolean){
  const scale = [c2d.canvas.width, c2d.canvas.height]
  return {scale, center: [scale[0]*0.5, scale[1]*(z? 0.3 : 0.5)]}
}
function drawChain(chain: FIK.Chain3D, c2d: CanvasRenderingContext2D, colors: number[][], z: boolean){
  const {scale, center} = scaleAndCenter(c2d, z)
  chain.bones.forEach((bone, index) => {
    if (index === 0) return
    const color = getInterpolatedColor(1 - (index-1)/(chain.bones.length-2), colors)
    c2d.strokeStyle = `rgb(${color[0]} ${color[1]} ${color[2]})`
    c2d.beginPath()
    c2d.moveTo(bone.start.x*scale[0] + center[0], -(z?bone.start.z:bone.start.y)*scale[1] + center[1])
    c2d.lineTo(bone.end.x*scale[0] + center[0], -(z?bone.end.z:bone.end.y)*scale[1] + center[1])
    c2d.stroke()
  })
}
function drawLine(line: XYZ[], c2d: CanvasRenderingContext2D, colors: number[][], z:boolean){
  const {scale, center} = scaleAndCenter(c2d, z)
  let prev = line[0]
  line.forEach((pos, index) => {
    if (index === 0 ) return
    const color = getInterpolatedColor(1 - (index-1)/(line.length-1), colors)
    c2d.strokeStyle = `rgb(${color[0]} ${color[1]} ${color[2]})`
    c2d.beginPath()
    c2d.moveTo(prev.x*scale[0] + center[0], - (z?prev.z:prev.y)*scale[1] + center[1])
    c2d.lineTo(pos.x*scale[0] + center[0], - (z?pos.z:pos.y)*scale[1] + center[1])
    c2d.stroke()
    prev = pos
  })
}
//  Debug drawing for FikStructure3DEx
export function drawFikStructure(structure: FikStructure3DEx, landmarks:AllLandmarks, c2d: CanvasRenderingContext2D){
  if (!landmarks.poseLm3d) return
  drawChain(structure.chains[0], c2d, [[255,255,0],[255,0,0]], true)
  drawChain(structure.chains[1], c2d, [[255,0,255],[0,0,255]], true)
  const head = mp2VrmV3(landmarks.poseLm3d[0], structure)
  const lh = structure.chains[0].bones[0].start
  const rh = structure.chains[1].bones[0].start
  drawLine([lh, head, rh], c2d, [[255,0,0],[255,255,255],[0,0,255]], true)
  drawChain(structure.chains[0], c2d, [[255,255,0],[255,0,0]], false)
  drawChain(structure.chains[1], c2d, [[255,0,255],[0,0,255]], false)
  drawLine([lh, head, rh], c2d, [[255,0,0],[255,255,255],[0,0,255]], false)

  if (printCount%10===1){
    const errors = [
      structure.chains[0].embeddedTarget?.distanceTo(structure.chains[0].bones[2].end),
      structure.chains[1].embeddedTarget?.distanceTo(structure.chains[1].bones[2].end),
    ]
    //  console.log(`error l r = ${errors[0]?.toFixed(3)} ${errors[0]?.toFixed(3)}`)
    // console.log(`head ${printV3(head)} lh ${printV3(lh)} rh ${printV3(rh)}`)
  }
}

//-------------------------------------------------------------------------------
//  Apply pose from landmark to VRM, using FIK for arms.

//  Create FikStructure3DEx regarding VRM
export function createStrcture3DEx(vrm: VRM): FikStructure3DEx{
  //  Compute path length of VRM bones
  function lengthSumForVrm(lps:(THREE.Vector3|null|undefined)[]){
    let sum = 0
    for(const lp of lps){
      sum += lp ? lp.length() : 0
    }
    return sum
  }

  const structure:FikStructure3DEx = new FIK.Structure3D() as FikStructure3DEx
  structure.add(new FIK.Chain3D())
  structure.add(new FIK.Chain3D())
  structure.chains[0].setSolveDistanceThreshold(0.01)
  structure.chains[1].setSolveDistanceThreshold(0.01)
  structure.lengthsList = [[
    vrm.humanoid.getNormalizedBoneNode('leftLowerArm')!.position.length(),
    vrm.humanoid.getNormalizedBoneNode('leftHand')!.position.length(),
  ], [
    vrm.humanoid.getNormalizedBoneNode('rightLowerArm')!.position.length(),
    vrm.humanoid.getNormalizedBoneNode('rightHand')!.position.length(),
  ]]
  function addBones(index: number, nBones: number){
    for(let i=0; i<nBones; ++i){
      structure.chains[index].addBone(new FIK.Bone3D(new FIK.V3(), new FIK.V3()))
    }
  }
  addBones(0, 3)
  addBones(1, 3)

  const handToHandPosList = getVrmNodes(vrm, ['leftHand', 'leftLowerArm', 'leftUpperArm', 'leftShoulder',
    'rightShoulder', 'rightUpperArm', 'rightLowerArm', 'rightHand']).map(node => node?.position)
  function getVrmNodes(vrm: VRM, names: VRMHumanBoneName[]): (THREE.Object3D|null)[] {
    const rv:(THREE.Object3D|null)[] = []
    for(const name of names){
      rv.push(vrm.humanoid.getNormalizedBoneNode(name))
    }
    return rv
  }

  structure.vrmHandToHandLength = lengthSumForVrm(handToHandPosList)
  structure.scale = 1

  return structure
}

//-------------------------------------------------------------------------------
//  Compute IK for one chain
function updateFikChain(chain: FIK.Chain3D, lengths:number[], lms: {x:number, y:number, z:number}[]){
  let prevPos = new FIK.V3()
  let pos = new FIK.V3()
  for (let i=0; i < lms.length; i++) {
    pos = new FIK.V3().copy(lms[i])
    const bone = chain.bones[i]
    if (i===0) {  //  frist bone is the fixed root.
      chain.setBaseLocation(pos)
      prevPos.copy(pos)
      bone.init(pos, pos)
    } else {  //  movable bones
      const dir = pos.clone().minus(prevPos)
      bone.init(prevPos, undefined, dir, lengths[i-1])
      prevPos.copy(bone.end)
    }
  }
  chain.lastTargetLocation = new FIK.V3( 1e10, 1e10, 1e10 ) //  need to reset to force solve every call
  chain.embeddedTarget = pos.clone()
  chain.useEmbeddedTarget = true
  chain.updateChainLength()
}

//  Compute IK for arms and apply all landmarks to VRM.
export function updateStructure3DEx(vrm:VRM, structure: FikStructure3DEx, lms: AllLandmarks){
  printCount ++;  //  debug print count
  //  path length of hand-to-hand used for scaling
  function lengthSumForMP(lms: ({x:number, y:number, z:number}|null|undefined)[]){
    let sum = 0
    let lastPos = {x:0, y:0, z:0}
    if (lms[0]) lastPos = lms[0]
    for(let i=1; i<lms.length; i++){
      let pos = lms[i] || lastPos
      sum += Math.sqrt(square(pos.x-lastPos.x) + square(pos.y-lastPos.y) + square(pos.z-lastPos.z))
      lastPos = pos
    }
    return sum
  }

  //  Apply spine and face
  if (lms.poseLm3d && lms.poseLm){
    structure.hips = Kalidokit.Pose.calcHips(lms.poseLm3d, lms.poseLm)
    applyHipsToVrm(vrm, structure)
  }else{
    if (!lms.faceLm) setRestingPoseToVrm(vrm)
  }
  if (lms.faceLm){
    structure.face = Kalidokit.Face.solve(lms.faceLm, {runtime: "mediapipe"})
    if (structure.face){
      applyFaceRigToVrm(vrm, structure.face)
      if (!lms.poseLm3d || !lms.poseLm){
        rigRotation(vrm, "chest", new THREE.Euler(0,-structure.face.head.y,0), 1, 0.2);
        rigRotation(vrm, "spine", new THREE.Euler(0,-structure.face.head.y,0), 1, 0.1);
      }
    }
  }

  const hips = vrm.humanoid.getNormalizedBoneNode('hips')
  const head = vrm.humanoid.getNormalizedBoneNode('head')
  if (lms.poseLm3d && hips && head){
    //  Update the transformation from landmarks to VRM's head coordinate so that heads take the same position.
    const mpHandToHandLength = lengthSumForMP([lms.poseLm3d[15], lms.poseLm3d[13], lms.poseLm3d[11], lms.poseLm3d[12], lms.poseLm3d[14], lms.poseLm3d[16]])
    structure.scale = structure.vrmHandToHandLength / mpHandToHandLength
    structure.m4wHipsInv = hips.matrixWorld.clone().invert()

    const m4Head = structure.m4wHipsInv.clone().multiply(head.matrixWorld)
    const mrHead = m4Head.clone()
    removeTranslateion(mrHead)
    const offset = new THREE.Vector3(0, 0, -0.15).applyMatrix4(mrHead) //  LM and VRM head center's
    const headPos = getTranslation(m4Head).add(offset)
    structure.mrHeadInv = mrHead.clone().invert()
    const hLmHead = scaleLm(lms.poseLm3d[0], structure)
    hLmHead.applyMatrix4(structure.mrHeadInv)
    structure.hHeadTohLm = new THREE.Vector3().subVectors(hLmHead, headPos)
    /*
    if (printCount%10 === 1){
      const qrHead = new THREE.Quaternion()
      qrHead.setFromRotationMatrix(mrHead)
      console.log(`qrHead:${printV3(qrHead)} h2L:${printV3(structure.hHeadTohLm)} `)
    } */

    //  Get the root positions of the arms in the head coordinates
    const leftUpperArm = vrm.humanoid.getNormalizedBoneNode('leftUpperArm')
    const rightUpperArm = vrm.humanoid.getNormalizedBoneNode('rightUpperArm')
    const leftArmRoot = getTranslation(leftUpperArm!.matrixWorld.clone().premultiply(structure.m4wHipsInv))
    const rightArmRoot = getTranslation(rightUpperArm!.matrixWorld.clone().premultiply(structure.m4wHipsInv))
    const lmArms = [    //  Landmarks for arms
      [leftArmRoot, mp2VrmV3(lms.poseLm3d[13], structure), mp2VrmV3(lms.poseLm3d[15], structure)],
      [rightArmRoot, mp2VrmV3(lms.poseLm3d[14], structure), mp2VrmV3(lms.poseLm3d[16], structure)]]
    //  Update IK chain for arms
    updateFikChain(structure.chains[0], structure.lengthsList[0], lmArms[0])
    updateFikChain(structure.chains[1], structure.lengthsList[1], lmArms[1])

    //  Solve IK chains
    structure.update()

    //  apply chainns to VRM
    const nodes = [
      [
        vrm.humanoid.getNormalizedBoneNode('leftShoulder'),
        vrm.humanoid.getNormalizedBoneNode('leftUpperArm'),
        vrm.humanoid.getNormalizedBoneNode('leftLowerArm'),
        vrm.humanoid.getNormalizedBoneNode('leftHand'),
      ],
      [
        vrm.humanoid.getNormalizedBoneNode('rightShoulder'),
        vrm.humanoid.getNormalizedBoneNode('rightUpperArm'),
        vrm.humanoid.getNormalizedBoneNode('rightLowerArm'),
        vrm.humanoid.getNormalizedBoneNode('rightHand'),
      ],
    ]
    applyChainToVrmBones(nodes[0], structure.chains[0], structure)
    applyChainToVrmBones(nodes[1], structure.chains[1], structure)
  }

  //  Apply hands' landmarks to VRM
  if (lms.leftHandLm) applyHand('left', lms.leftHandLm, vrm, structure)
  if (lms.rightHandLm) applyHand('right', lms.rightHandLm, vrm, structure)

  function applyHand(lr:'left'|'right', lms: LandmarkList, vrm:VRM, structure: FikStructure3DEx){
    //  Compute and apply hand orientation
    //  wrist, index, pinky
    const hand = [mp2VrmV3(lms[0], structure), mp2VrmV3(lms[5], structure), mp2VrmV3(lms[17], structure)]
    const indexToPinky = new THREE.Vector3().subVectors(hand[2], hand[1])
    const handCenter = new THREE.Vector3().addVectors(hand[1], indexToPinky.clone().multiplyScalar(0.5))
    indexToPinky.normalize()
    const handDir = new THREE.Vector3().subVectors(handCenter, hand[0]).normalize()

    const normal = new THREE.Vector3().crossVectors(indexToPinky, handDir).normalize()
    const ipOrtho = new THREE.Vector3().crossVectors(handDir, normal)
    const mrHand = lr==='right' ? new THREE.Matrix4().makeBasis(handDir, normal, ipOrtho) :
      new THREE.Matrix4().makeBasis(handDir.negate(), normal.negate(), ipOrtho)
  /*
    if (printCount % 10 === 1){
      console.log(`${lr} hand ip:${printV3(indexToPinky)}  dir:${printV3(handDir)} n:${printV3(normal)}}`)
    } */

    //  apply hand orientation
    const m4LowerArm = vrm.humanoid.getNormalizedBoneNode(`${lr}LowerArm`)?.matrixWorld.clone()
    if (m4LowerArm){
      m4LowerArm.premultiply(structure.m4wHipsInv)
      removeTranslateion(m4LowerArm)
      const mrlHand = mrHand.clone().premultiply(m4LowerArm.transpose())
      const qlHand = new THREE.Quaternion().setFromRotationMatrix(mrlHand)
      vrm.humanoid.getNormalizedBoneNode(`${lr}Hand`)?.quaternion.slerp(qlHand, 0.5)

      //  Compute and apply fingers
      const thumbLms = [mp2VrmV3(lms[1], structure), mp2VrmV3(lms[2], structure), mp2VrmV3(lms[3], structure), mp2VrmV3(lms[4], structure)]
      const fourFingersLmses = [
        [mp2VrmV3(lms[5], structure), mp2VrmV3(lms[6], structure), mp2VrmV3(lms[7], structure), mp2VrmV3(lms[8], structure)],
        [mp2VrmV3(lms[9], structure), mp2VrmV3(lms[10], structure), mp2VrmV3(lms[11], structure), mp2VrmV3(lms[12], structure)],
        [mp2VrmV3(lms[13], structure), mp2VrmV3(lms[14], structure), mp2VrmV3(lms[15], structure), mp2VrmV3(lms[16], structure)],
        [mp2VrmV3(lms[17], structure), mp2VrmV3(lms[18], structure), mp2VrmV3(lms[19], structure), mp2VrmV3(lms[20], structure)],
      ]
      applyFinger('Thumb', thumbBoneNames, thumbLms)
      fourFingerNames.forEach( (fname, f)=>{
        applyFinger(fname, fingerBoneNames, fourFingersLmses[f])
      })
      function applyFinger(fingerName:FingerName|'Thumb', boneNames:ThumbBoneName[]|FingerBoneName[], lms: THREE.Vector3[]){
        let node = vrm.humanoid.getNormalizedBoneNode(`${lr}${fingerName}${boneNames[0]}` as VRMHumanBoneName)
        let orgDir:THREE.Vector3
        let prevQuat = new THREE.Quaternion().setFromRotationMatrix(mrHand)
        for(let i=0; i<boneNames.length; ++i){
          let nextNode = i<boneNames.length-1 ? vrm.humanoid.getNormalizedBoneNode(`${lr}${fingerName}${boneNames[i+1]}` as VRMHumanBoneName) : null
          if (nextNode){
            orgDir = nextNode.position.clone().normalize()
          }
          const curDir = new THREE.Vector3().subVectors(lms[i+1], lms[i]).normalize().applyQuaternion(prevQuat.clone().invert())
          const quat = new THREE.Quaternion().setFromUnitVectors(orgDir!, curDir)
          if (node){
            node.quaternion.slerp(quat, 0.5)
            prevQuat.multiply(node.quaternion)
          }
          node = nextNode
        }
      }
    }
  }
}

//--------------------------------------------------------
//  Set rest pose (hard coded pose not the restpose in VRM) to VRM
const fourFingerNames:FourFingerName[] = ['Index',  'Middle' , 'Ring' , 'Little']
type FourFingerName = 'Index' | 'Middle'| 'Ring' | 'Little'
type FingerName = 'Thumb' | FourFingerName
const fingerNames:FingerName[] = ['Thumb', ...fourFingerNames]
type ThumbBoneName = 'Metacarpal'|'Proximal'|'Distal'
const thumbBoneNames:ThumbBoneName[] = ['Metacarpal', 'Proximal', 'Distal']
type FingerBoneName = 'Proximal'|'Intermediate'|'Distal'
const fingerBoneNames:FingerBoneName[] = ['Proximal', 'Intermediate', 'Distal']
type LeftRight =  'left'|'right'
const leftRight:LeftRight[] = ['left', 'right']

export function setRestingPoseToVrm(vrm: VRM){
  vrm.expressionManager?.resetValues()
  vrm.humanoid.resetNormalizedPose()
  setRestingPosetToHand(vrm)
  function setRestingPosetToHand(vrm: VRM){
    function restFinger(lr:'left'|'right', name:FingerName){
      const lrpm = lr==='left' ? 1 : -1
      if (name==='Thumb'){
        thumbBoneNames.forEach(bn=>{
          vrm.humanoid.getNormalizedBoneNode(`${lr}Thumb${bn}`)?.quaternion.setFromEuler( new THREE.Euler(0.2, lrpm*0.4, lrpm*0.2))
        })
      }else{
        fingerBoneNames.forEach(bn=>{
          vrm.humanoid.getNormalizedBoneNode(`${lr}${name}${bn}`)?.quaternion.setFromEuler( new THREE.Euler(0, 0, lrpm*0.2))
        })
      }
    }
    function restOneHand(lr:'left'|'right'){
      const lrpm = lr==='left' ? 1 : -1
      vrm.humanoid.getNormalizedBoneNode(`${lr}UpperArm`)?.quaternion.setFromEuler( new THREE.Euler(-0.2, 0, lrpm*1.2))
      vrm.humanoid.getNormalizedBoneNode(`${lr}LowerArm`)?.quaternion.setFromEuler( new THREE.Euler(0, -lrpm*1.0, lrpm*0.3))
      vrm.humanoid.getNormalizedBoneNode(`${lr}Hand`)?.quaternion.setFromEuler(new THREE.Euler(0, 0, lrpm*0.3))
      fingerNames.forEach((name:FingerName)=>{
        restFinger(lr, name)
      })
    }
    leftRight.forEach((lr)=> restOneHand(lr))
  }
}


const clamp = Kalidokit.Utils.clamp;
const lerp = Kalidokit.Vector.lerp;

function applyChainToVrmBones(vrmBones: (THREE.Object3D|null)[], chain: FIK.Chain3D, structure: FikStructure3DEx){
  const m4hBone = vrmBones[0]?.matrixWorld.clone().premultiply(structure.m4wHipsInv)
  if (!m4hBone) return
  let qhPrev = new THREE.Quaternion().setFromRotationMatrix(m4hBone)
  let orgDir
  for(let i=1; i<vrmBones.length-1; ++i){
    const nextNode = vrmBones[i+1]
    const node = vrmBones[i]
    const bone = chain.bones[i]
    orgDir = nextNode?.position.clone().normalize()
    const curDir = new THREE.Vector3().subVectors(bone.end, bone.start).normalize().applyQuaternion(qhPrev.clone().invert())
    const quat = new THREE.Quaternion().setFromUnitVectors(orgDir!, curDir)
    if (node){
      node.quaternion.slerp(quat, 0.5)
      qhPrev.multiply(node.quaternion)
    }
  }
}

let oldLookTarget = new THREE.Euler()
function applyFaceRigToVrm(vrm:VRM, faceRig:Kalidokit.TFace){
  if(!vrm){return}
  const rot = {x:faceRig.head.x-0.1, y:-faceRig.head.y, z:-faceRig.head.z}
  //console.log(`rigRot: ${JSON.stringify(rot)}`)
  rigRotation(vrm, "neck", rot, 0.7);

  // Blendshapes and Preset Name Schema
  const Blendshape = vrm.expressionManager!
  const PresetName = VRMExpressionPresetName;

  // Simple example without winking. Interpolate based on old blendshape, then stabilize blink with `Kalidokit` helper function.
  // for VRM, 1 is closed, 0 is open.
  //console.log(`face eye:${faceRig.eye.l},${faceRig.eye.r}`)
  const eyeL = clamp(1-faceRig.eye.l, 0, 1)
  const eyeR = clamp(1-faceRig.eye.r, 0, 1)
  Blendshape.setValue(PresetName.BlinkLeft, eyeR);
  Blendshape.setValue(PresetName.BlinkRight, eyeL);

  // Interpolate and set mouth blendshapes
  Blendshape.setValue(PresetName.Ih, lerp(faceRig.mouth.shape.I,Blendshape.getValue(PresetName.Ih)!, .5));
  Blendshape.setValue(PresetName.Aa, lerp(faceRig.mouth.shape.A,Blendshape.getValue(PresetName.Aa)!, .5));
  Blendshape.setValue(PresetName.Ee, lerp(faceRig.mouth.shape.E,Blendshape.getValue(PresetName.Ee)!, .5));
  Blendshape.setValue(PresetName.Oh, lerp(faceRig.mouth.shape.O,Blendshape.getValue(PresetName.Oh)!, .5));
  Blendshape.setValue(PresetName.Ou, lerp(faceRig.mouth.shape.U,Blendshape.getValue(PresetName.Ou)!, .5));

  //PUPILS
  //interpolate pupil and keep a copy of the value
  let lookTarget =
    new THREE.Euler(
      lerp(-oldLookTarget.x , faceRig.pupil.y, .4),
      lerp(oldLookTarget.y, faceRig.pupil.x, .4),
      0,
      "XYZ"
    )
  oldLookTarget.copy(lookTarget)
  vrm.lookAt?.applier?.applyYawPitch(lookTarget.y, lookTarget.x)
}

function applyHipsToVrm(vrm: VRM, structure: FikStructure3DEx){
  if (structure.hips){
    const rotHip = {...structure.hips.Hips.rotation!}
    const rotSpine = {...structure.hips.Spine}
    rotHip.y *= -1;     rotHip.z *= -1
    rotSpine.y *= -1;   rotSpine.z *= -1
    rigRotation(vrm, "hips", rotHip, 0.7);
    rigRotation(vrm, "chest", rotSpine, 0.25, .3);
    rigRotation(vrm, "spine", rotSpine, 0.45, .3);
  }
}

//  The minimum info of VRM's posture to send to other clients.
export interface VrmRig{
  faceRig?: Kalidokit.TFace
  body?: [number,number,number][]
  leftHand?: [number,number,number][]
  rightHand?: [number,number,number][]
}

//  name of bones
const vrmBodyRigNames:VRMHumanBoneName[] = [
  'hips', 'spine', 'chest', 'neck', 'leftUpperArm', 'leftLowerArm', 'leftHand', 'rightUpperArm', 'rightLowerArm', 'rightHand'
]
const vrmLeftHandRigNames:VRMHumanBoneName[] = [
  'leftThumbMetacarpal', 'leftThumbProximal', 'leftThumbDistal',
  'leftIndexProximal', 'leftIndexIntermediate', 'leftIndexDistal',
  'leftMiddleProximal', 'leftMiddleIntermediate', 'leftMiddleDistal',
  'leftRingProximal', 'leftRingIntermediate', 'leftRingDistal',
  'leftLittleProximal', 'leftLittleIntermediate', 'leftLittleDistal',
]
const vrmRightHandRigNames:VRMHumanBoneName[] = [
  'rightThumbMetacarpal', 'rightThumbProximal', 'rightThumbDistal',
  'rightIndexProximal', 'rightIndexIntermediate', 'rightIndexDistal',
  'rightMiddleProximal', 'rightMiddleIntermediate', 'rightMiddleDistal',
  'rightRingProximal', 'rightRingIntermediate', 'rightRingDistal',
  'rightLittleProximal', 'rightLittleIntermediate', 'rightLittleDistal',
]
//  Extract VrmRig from a VRM avatar. lms is used to check which parts of the body are included.
export function extractVrmRig(avatar: VRMAvatar, lms: AllLandmarks): VrmRig{
  const rv = {
    faceRig: avatar.structure?.face,
  }
  extractRigQuats(rv, avatar.vrm, lms)
  return rv
}
function extractRigQuats(rig:VrmRig, vrm:VRM, lms:AllLandmarks){
  if (lms.poseLm3d) rig.body = extractQuats(vrm, vrmBodyRigNames)
  if (lms.leftHandLm) rig.leftHand = extractQuats(vrm, vrmLeftHandRigNames)
  if (lms.rightHandLm) rig.rightHand = extractQuats(vrm, vrmRightHandRigNames)
}
function extractQuats(vrm:VRM, names: VRMHumanBoneName[]){
  return names.map(name => {
    const q = vrm.humanoid.getNormalizedBoneNode(name)?.quaternion
    return (q? [q.x, q.y, q.z] : [0,0,0]) as [number, number, number]
  })
}

//  Apply VrmRig to a VRM avatar.
export function applyVrmRig(vrm:VRM, rig: VrmRig){
  if (rig.body) applyQuats(vrm, vrmBodyRigNames, rig.body)
  if (rig.leftHand) applyQuats(vrm, vrmLeftHandRigNames, rig.leftHand)
  if (rig.rightHand) applyQuats(vrm, vrmRightHandRigNames, rig.rightHand)
  if (rig.faceRig) applyFaceRigToVrm(vrm, rig.faceRig)
}
function applyQuats(vrm:VRM, names:VRMHumanBoneName[], quats:[number,number,number][]){
  names.forEach((name, i) => {
    if(i >= quats.length) return
    const node = vrm.humanoid.getNormalizedBoneNode(name)
    if (node){
      node.quaternion.x = quats[i][0]
      node.quaternion.y = quats[i][1]
      node.quaternion.z = quats[i][2]
      node.quaternion.w = Math.sqrt(1 - (square(quats[i][0])+square(quats[i][1])+square(quats[i][2])))
    }
  })
}
