import * as THREE from 'three';
import { VRM, VRMExpressionPresetName, VRMHumanBoneName } from '@pixiv/three-vrm'
import * as FIK from 'fullik';
import { AllLandmarks } from '@models/Participant';
import { normV, square } from './coordinates';
import * as Kalidokit from 'kalidokit'
import { Landscape } from '@material-ui/icons';
import { LandmarkList } from '@mediapipe/holistic';

export function printV3(v?:{x:number,y:number,z:number}){
  if(v) return `(${v.x.toFixed(2)} ${v.y.toFixed(2)} ${v.z.toFixed(2)})`
  else 'undef'
}
let printCount = 0

export interface Structure3DEx extends FIK.Structure3D{
  hips?: {Hips: Kalidokit.IHips, Spine: Kalidokit.XYZ}
  face?: Kalidokit.TFace
  lengthsList:number[][]
  vrmSholderWidth:number
  vrmHandToHandLength:number
  scale: number
  qwHeadInv: THREE.Quaternion
  hHeadTohLm: THREE.Vector3
}

function scaleLm(v:{x:number,y:number,z:number}, s:Structure3DEx) {
  return new THREE.Vector3(-v.x*s.scale, -v.y*s.scale, v.z*s.scale)
}
function mp2VrmV3(v:{x:number,y:number,z:number}, s:Structure3DEx){  //  Convert into VRM = OpenGL coordinates.
  const cooked = scaleLm(v, s)
  cooked.applyQuaternion(s.qwHeadInv) //  rotated
  cooked.sub(s.hHeadTohLm)
  return cooked
}

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
function drawLine(line: {x:number,y:number,z:number}[], c2d: CanvasRenderingContext2D, colors: number[][], z:boolean){
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

export function drawFikStructure(structure: Structure3DEx, landmarks:AllLandmarks, c2d: CanvasRenderingContext2D){
  drawChain(structure.chains[0], c2d, [[255,255,0],[255,0,0]], true)
  drawChain(structure.chains[1], c2d, [[255,0,255],[0,0,255]], true)
  const head = mp2VrmV3(landmarks.poseLm3d![0], structure)
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
  //chain.embeddedTarget.z -= 0.1
  chain.useEmbeddedTarget = true
  chain.updateChainLength()
}
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
function lengthSumForVrm(lps:(THREE.Vector3|null|undefined)[]){
  let sum = 0
  for(const lp of lps){
    sum += lp ? lp.length() : 0
  }
  return sum
}

export function updateStructure3DEx(vrm:VRM, structure: Structure3DEx, lms: AllLandmarks){
  if (!lms.poseLm3d || !lms.poseLm) return
  printCount ++;
  //  update spine and face
  structure.hips = Kalidokit.Pose.calcHips(lms.poseLm3d, lms.poseLm)
  applyHipsToVrm(vrm, structure)
  if (lms.faceLm){
    structure.face = Kalidokit.Face.solve(lms.faceLm, {runtime: "mediapipe"})
    if (structure.face) applyFaceRigToVrm(vrm, structure.face)
  }

  //  update scale and head quaternion in world coordinates
  const mpHandToHandLength = lengthSumForMP([lms.poseLm3d[15], lms.poseLm3d[13], lms.poseLm3d[11], lms.poseLm3d[12], lms.poseLm3d[14], lms.poseLm3d[16]])
  structure.scale = structure.vrmHandToHandLength / mpHandToHandLength
  const qwH = new THREE.Quaternion()
  vrm.humanoid.getNormalizedBoneNode('head')?.getWorldQuaternion(qwH)
  structure.qwHeadInv = qwH.clone().invert()
  const hHeadPos = new THREE.Vector3()
  vrm.humanoid.getNormalizedBoneNode('head')?.getWorldPosition(hHeadPos)
  const offset = new THREE.Vector3(0, 0, -0.15) //  LM and VRM head center's
  offset.applyQuaternion(qwH)
  hHeadPos.add(offset)
  hHeadPos.applyQuaternion(structure.qwHeadInv)
  const hLmHead = scaleLm(lms.poseLm3d[0], structure)
  hLmHead.applyQuaternion(structure.qwHeadInv)
  structure.hHeadTohLm = new THREE.Vector3().subVectors(hLmHead, hHeadPos)

  //  sholder position in head coordinates
  const qhLeftSholder = new THREE.Quaternion()
  vrm.humanoid.getNormalizedBoneNode('leftShoulder')?.getWorldQuaternion(qhLeftSholder)
  qhLeftSholder.premultiply(structure.qwHeadInv)
  const leftArmDir = vrm.humanoid.getNormalizedBoneNode('leftLowerArm')?.position.clone().applyQuaternion(qhLeftSholder).normalize()
  const leftArmRoot = new THREE.Vector3()
  vrm.humanoid.getNormalizedBoneNode('leftUpperArm')?.getWorldPosition(leftArmRoot)
  leftArmRoot.applyQuaternion(structure.qwHeadInv)

  const qhRightSholder = new THREE.Quaternion()
  vrm.humanoid.getNormalizedBoneNode('rightShoulder')?.getWorldQuaternion(qhRightSholder)
  qhRightSholder.premultiply(structure.qwHeadInv)
  const rightArmDir = vrm.humanoid.getNormalizedBoneNode('rightLowerArm')?.position.clone().applyQuaternion(qhRightSholder).normalize()
  const rightArmRoot = new THREE.Vector3()
  vrm.humanoid.getNormalizedBoneNode('rightUpperArm')?.getWorldPosition(rightArmRoot)
  rightArmRoot.applyQuaternion(structure.qwHeadInv)

  //  update arms
  const arms = [
    [leftArmRoot, mp2VrmV3(lms.poseLm3d[13], structure), mp2VrmV3(lms.poseLm3d[15], structure)],
    [rightArmRoot, mp2VrmV3(lms.poseLm3d[14], structure), mp2VrmV3(lms.poseLm3d[16], structure)]]

  //  update arms
  updateFikChain(structure.chains[0], structure.lengthsList[0], arms[0])
  updateFikChain(structure.chains[1], structure.lengthsList[1], arms[1])

  //  Solve IK
  structure.update()

  //  apply to VRM
  const nodes = [
    [
      vrm.humanoid.getNormalizedBoneNode('leftUpperArm'),
      vrm.humanoid.getNormalizedBoneNode('leftLowerArm'),
    ],
    [
      vrm.humanoid.getNormalizedBoneNode('rightUpperArm'),
      vrm.humanoid.getNormalizedBoneNode('rightLowerArm'),
    ],
  ]
  applyChainToVrmBones(nodes[0], structure.chains[0], leftArmDir!)
  applyChainToVrmBones(nodes[1], structure.chains[1], rightArmDir!)

  if (lms.leftHandLm) setHandDir('left', lms.leftHandLm)
  if (lms.rightHandLm) setHandDir('right', lms.rightHandLm)
  function setHandDir(lr:'left'|'right', lms: LandmarkList){
    //  wrist, index, pinky
    const hand = [mp2VrmV3(lms[0], structure), mp2VrmV3(lms[5], structure), mp2VrmV3(lms[17], structure)]
    const indexToPinky = new THREE.Vector3().subVectors(hand[2], hand[1])
    const handCenter = new THREE.Vector3().addVectors(hand[1], indexToPinky.clone().multiplyScalar(0.5))
    indexToPinky.normalize()
    const handDir = new THREE.Vector3().subVectors(handCenter, hand[0]).normalize()

    const normal = new THREE.Vector3().crossVectors(indexToPinky, handDir).normalize()
    const ipOrtho = new THREE.Vector3().crossVectors(handDir, normal)
    const basis = lr==='right' ? new THREE.Matrix4().makeBasis(handDir, normal, ipOrtho) :
      new THREE.Matrix4().makeBasis(handDir.negate(), normal.negate(), ipOrtho)
    if (printCount % 10 === 1){
      console.log(`${lr} hand ip:${printV3(indexToPinky)}  dir:${printV3(handDir)} n:${printV3(normal)}}`)
    }

    const qhHand = new THREE.Quaternion().setFromRotationMatrix(basis)
    const qhLowerArm = new THREE.Quaternion()
    vrm.humanoid.getNormalizedBone(`${lr}LowerArm`)?.node.getWorldQuaternion(qhLowerArm)
    qhLowerArm.premultiply(structure.qwHeadInv)
    //  qhLowerArm * qHand = qhHand. qHand = qhLowerArm.inv() * qhHand
    const qHand = qhLowerArm.invert().multiply(qhHand)
    //if (printCount % 10 === 1) console.log(`${lr} hand q:${printV3(qhHand)}`)
    vrm.humanoid.getNormalizedBone(`${lr}Hand`)?.node.quaternion.slerp(qHand, 0.5)
  }

  applyHands(structure, lms)
/*
    if (printCount % 10 === 1 && lms.rightHandLm){
      const wrist = mp2VrmV3(lms.rightHandLm[0], structure)
      const pinky = mp2VrmV3(lms.rightHandLm[17], structure)
      const index = mp2VrmV3(lms.rightHandLm[5], structure)
      const pToI = new THREE.Vector3().subVectors(index, pinky)
      const wToI = new THREE.Vector3().subVectors(index, wrist)
      console.log(`RhandLM: ${printV3(lms.rightHandLm[0])} hand: ${printV3(pToI)}  ${printV3(wToI)}`)
    }
*/
}
function applyHands(structure: Structure3DEx, all: AllLandmarks){
  all.leftHandLm
}


export function createStrcture3DEx(vrm: VRM){
  const structure:Structure3DEx = new FIK.Structure3D() as Structure3DEx
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
  structure.vrmHandToHandLength = lengthSumForVrm(handToHandPosList)

  const leftUpperArm = new THREE.Vector3()
  const rightUpperArm = new THREE.Vector3()
  vrm.humanoid.getNormalizedBoneNode('leftUpperArm')?.getWorldPosition(leftUpperArm)
  vrm.humanoid.getNormalizedBoneNode('rightUpperArm')?.getWorldPosition(rightUpperArm)
  structure.vrmSholderWidth = leftUpperArm.sub(rightUpperArm).length()
  structure.scale = 1
  structure.qwHeadInv = new THREE.Quaternion()

  //console.log(`vrmH2H:${structure.vrmHandToHandLength.toFixed(2)}  vrmSW:${structure.vrmSholderWidth.toFixed(2)}`)

  return structure
}

function getVrmNodes(vrm: VRM, names: VRMHumanBoneName[]): (THREE.Object3D|null)[] {
  const rv:(THREE.Object3D|null)[] = []
  for(const name of names){
    rv.push(vrm.humanoid.getNormalizedBoneNode(name))
  }
  return rv
}





const clamp = Kalidokit.Utils.clamp;
const lerp = Kalidokit.Vector.lerp;
// Animate Rotation Helper function
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
function rigPosition(vrm: VRM,
  name:VRMHumanBoneName,
  position = { x: 0, y: 0, z: 0 },
  dampener = 1,
  lerpAmount = 0.3
){
  if (!vrm) {return}
  const Part = vrm.humanoid.getNormalizedBoneNode(name);
  if (!Part) {return}
  let vector = new THREE.Vector3(
    position.x * dampener,
    position.y * dampener,
    position.z * dampener
  );
  Part.position.lerp(vector, lerpAmount); // interpolate
}


function applyChainToVrmBones(vrmBones: (THREE.Object3D|null)[], chain: FIK.Chain3D, rootDir: THREE.Vector3){
  const angles:number[] = []
  let direction = new THREE.Vector3()
  let prevDirection = new THREE.Vector3()
chain.bones.forEach((bone, index) => {
    if (index < 1) return
    direction.subVectors(bone.end, bone.start).normalize()
    if (index === 1){
      prevDirection.copy(rootDir)
    }
    const quaternion = new THREE.Quaternion().setFromUnitVectors(prevDirection, direction);
    angles.push(normV([quaternion.x, quaternion.y, quaternion.z]))
    if (rootDir.x > 0 && index === 2 && printCount%10===1){
      //console.log(`dirs: ${printV3(prevDirection)} ${printV3(direction)}  quat:${printV3(quaternion)}`)
    }
    if (vrmBones[index-1]) {
      vrmBones[index-1]?.quaternion.slerp(quaternion, 0.5);
    }else{
      console.log(`vrmBones[${index}] undefined`)
    }
    prevDirection.copy(direction)
  })
  if (rootDir.x > 0){
    // console.log(`angles: ${JSON.stringify(angles.map(a=>a.toFixed(2)))}`)
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

function applyHipsToVrm(vrm: VRM, structure: Structure3DEx){
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
