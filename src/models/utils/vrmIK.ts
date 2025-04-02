import * as THREE from 'three';
import { VRM, VRMExpressionPresetName, VRMHumanBoneName } from '@pixiv/three-vrm'
import * as FIK from 'fullik';
import { AllLandmarks } from '@models/Participant';
import { normV, square } from './coordinates';
import { LandmarkList, NormalizedLandmarkList } from '@mediapipe/holistic';
import * as Kalidokit from 'kalidokit'
import { KeyboardArrowLeft } from '@material-ui/icons';


type Landmark = { x: number; y: number; z: number };

// ランドマークを THREE.Vector3 に変換
function lmToVector3(lm: Landmark): THREE.Vector3 {
  return new THREE.Vector3(lm.x, lm.y, lm.z);
}

// 複数のランドマークの平均位置を計算
function averageLandmarks(lms: Landmark[]): THREE.Vector3 {
  const sum = lms.reduce((acc, lm) => lmToVector3(acc).add(lmToVector3(lm)), new THREE.Vector3());
  return lmToVector3(sum).divideScalar(lms.length);
}

export interface Structure3DEx extends FIK.Structure3D{
  hips?: {Hips: Kalidokit.IHips, Spine: Kalidokit.XYZ}
  face?: Kalidokit.TFace
  ratiosList:number[][]
  sholderWidth:number
  vrmHandToHandLength:number
}

function getInterpolatedColor(ratio: number, colors:number[][]){
  return colors[0].map((el, j)=> ratio * el + (1-ratio)*colors[1][j])
}
function drawChain(chain: FIK.Chain3D, c2d: CanvasRenderingContext2D, colors: number[][]){
  const scale = [c2d.canvas.width, c2d.canvas.height]
  const center = [scale[0]/2, scale[1]*(0.5+0.3)]
  chain.bones.forEach((bone, index) => {
    if (index === 0) return
    const color = getInterpolatedColor(1 - (index-1)/(chain.bones.length-2), colors)
    c2d.strokeStyle = `rgb(${color[0]} ${color[1]} ${color[2]})`
    c2d.beginPath()
    c2d.moveTo(bone.start.x*scale[0] + center[0], -bone.start.y*scale[1] + center[1])
    c2d.lineTo(bone.end.x*scale[0] + center[0], -bone.end.y*scale[1] + center[1])
    c2d.stroke()
  })
}

export function drawFikStructure(structure: Structure3DEx, c2d: CanvasRenderingContext2D){
  drawChain(structure.chains[0], c2d, [[255,255,0],[255,0,0]])
  drawChain(structure.chains[1], c2d, [[255,0,255],[0,0,255]])
}

function updateFikChain(chain: FIK.Chain3D, ratios: number[], lms: NormalizedLandmarkList, lengthSum: number){
  //if (ratios.length>2) console.log(`len: ${lengthSum}`)
  const prevPos = new FIK.V3()
  let pos:FIK.V3 = new FIK.V3()
  for (let i=0; i < lms.length; i++) {
    pos = new FIK.V3().copy({x: lms[i].x, y:-lms[i].y, z:-lms[i].z})
    const bone = chain.bones[i]
    if (i === 0) {  //  frist bone is the fixed root.
      chain.setBaseLocation(pos)
      bone.init(pos, pos)
      prevPos.copy(pos)
    } else {  //  movable bones
      const dir = pos.minus(prevPos).normalize()
      bone.init(prevPos, undefined, dir, ratios[i-1]*lengthSum)
      prevPos.copy(bone.end)
    }
  }
  chain.lastTargetLocation = new FIK.V3( 1e10, 1e10, 1e10 ) //  need to reset to force solve every call
  chain.embeddedTarget = pos.clone()
  chain.useEmbeddedTarget = true
  chain.updateChainLength()
}
function lengthSum(lms: ({x:number, y:number, z:number}|null|undefined)[]){
  let sum = 0
  let lastPos = {x:0, y:0, z:0}
  if (lms[0]) lastPos = lms[0]
  for(let i=1; i<lms.length; i++){
    let pos = lms[i] || lastPos
    sum += Math.sqrt(square(pos.x-lastPos.x) + square(pos.y-lastPos.y) + square(pos.z-lastPos.z))
  }
  return sum
}
export function updateStructure3DEx(structure: Structure3DEx, lms: AllLandmarks){
  if (!lms.poseLm3d || !lms.poseLm) return
  structure.hips = Kalidokit.Pose.calcHips(lms.poseLm3d, lms.poseLm)
  if (lms.faceLm){
    structure.face = Kalidokit.Face.solve(lms.faceLm, {runtime: "mediapipe"})
  }
  const handToHandLengthLm = lengthSum([lms.poseLm3d[15], lms.poseLm3d[13], lms.poseLm3d[11], lms.poseLm3d[12], lms.poseLm3d[14], lms.poseLm3d[16]])
  const scale = handToHandLengthLm / structure.vrmHandToHandLength

  //  Solve IK. Neck pos is the root. sholder->ua->la->hand
  //  sholder, ua -> use VRM's position   la, hand -> user lm's pos

  //  adjust sholder width
  const arms = [[lms.poseLm3d[11], lms.poseLm3d[13], lms.poseLm3d[15]],
    [lms.poseLm3d[12], lms.poseLm3d[14], lms.poseLm3d[16]]]
  const armLengths = [
    lengthSum(arms[0]), lengthSum(arms[1])
  ]
  let ratio = 1
  if (structure.sholderWidth > 0){
    const sholderWidthInLm = (armLengths[0] + armLengths[1]) * structure.sholderWidth
    const lmSholderWidth = lengthSum([lms.poseLm3d[11], lms.poseLm3d[12]])
    ratio = sholderWidthInLm / lmSholderWidth
    console.log(`ratio: ${ratio}  sw:${structure.sholderWidth}`)
  }
  const mid = new THREE.Vector3().addVectors(lms.poseLm3d[11], lms.poseLm3d[12]).multiplyScalar(0.5)
  const dir = new THREE.Vector3().subVectors(lms.poseLm3d[12], lms.poseLm3d[11]).multiplyScalar(0.5*ratio)
  const left = new THREE.Vector3().subVectors(mid, dir)
  const right = new THREE.Vector3().addVectors(mid, dir)
  arms[0][0] = left
  arms[1][0] = right
  //  update arms
  updateFikChain(structure.chains[0], structure.ratiosList[0], arms[0], lengthSum(arms[0]))
  updateFikChain(structure.chains[1], structure.ratiosList[1], arms[1], lengthSum(arms[1]))

  structure.update()
}


export function createStrcture3DEx(vrm: VRM){
  const structure:Structure3DEx = new FIK.Structure3D() as Structure3DEx
  structure.add(new FIK.Chain3D())
  structure.add(new FIK.Chain3D())
  structure.ratiosList = [[], []]
  function addBones(index: number, nBones: number){
    for(let i=0; i<nBones; ++i){
      structure.chains[index].addBone(new FIK.Bone3D(new FIK.V3(), new FIK.V3()))
      if (i>0) structure.ratiosList[index].push(1/(nBones-1))
    }
  }
  addBones(0, 3)
  addBones(1, 3)

  const handToHandPoses = getVrmNodes(vrm, ['leftHand', 'leftLowerArm', 'leftUpperArm', 'leftShoulder',
    'rightShoulder', 'rightUpperArm', 'rightLowerArm', 'rightHand']).map(node => node?.position)
  structure.vrmHandToHandLength = lengthSum(handToHandPoses)

  const positionsList = getVRMIKTargets(vrm).map(nodes => nodes.map(node => node?.position ))
  let armLength = 0
  positionsList.forEach((positions, i) => {
    const ratios = structure.ratiosList[i]
    let sum = 0
    let prevPos = positions[0]!
    for(let j=1; j<positions.length; ++j){
      let pos = positions[j]
      if (!pos) pos = prevPos
      ratios[j-1] = new THREE.Vector3().subVectors(pos, prevPos).length()
      sum += ratios[j-1]
      prevPos = pos
    }
    for(let j=0; j<positions.length-1; ++j){
      ratios[j] /= sum
    }
    if (i<2) {  //  for left and right arms
      armLength += sum
    }
  })

  const left = vrm.humanoid.getNormalizedBoneNode('leftUpperArm')?.position
  const right = vrm.humanoid.getNormalizedBoneNode('rightUpperArm')?.position
  if (left && right){
    structure.sholderWidth = new THREE.Vector3().subVectors(left, right).length() / armLength
  }

  const sw = new THREE.Vector3().subVectors(left!, right!).length()
  const lenU = new THREE.Vector3().subVectors(vrm.humanoid.getNormalizedBoneNode('leftUpperArm')!.position, vrm.humanoid.getNormalizedBoneNode('leftLowerArm')!.position).length()
  const lenL = new THREE.Vector3().subVectors(vrm.humanoid.getNormalizedBoneNode('leftLowerArm')!.position, vrm.humanoid.getNormalizedBoneNode('leftHand')!.position).length()


  console.log(`sum:${armLength} sw u l:${sw} ${lenU} ${lenL} ratios: ${JSON.stringify(structure.ratiosList)}`)
  return structure
}

function getVrmNodes(vrm: VRM, names: VRMHumanBoneName[]): (THREE.Object3D|null)[] {
  const rv:(THREE.Object3D|null)[] = []
  for(const name of names){
    rv.push(vrm.humanoid.getNormalizedBoneNode(name))
  }
  return rv
}

function getVRMIKTargets(vrm: VRM): (THREE.Object3D|null)[][] {
  return [
    [
      vrm.humanoid.getNormalizedBoneNode('leftUpperArm'),
      vrm.humanoid.getNormalizedBoneNode('leftLowerArm'),
      vrm.humanoid.getNormalizedBoneNode('leftHand'),
    ],
    [
      vrm.humanoid.getNormalizedBoneNode('rightUpperArm'),
      vrm.humanoid.getNormalizedBoneNode('rightLowerArm'),
      vrm.humanoid.getNormalizedBoneNode('rightHand'),
    ],
  ]
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


function applyChainToVrmBones(vrmBones: (THREE.Object3D|null)[], chain: FIK.Chain3D, originDirection: THREE.Vector3){
  let prevBone: FIK.Bone3D | undefined = undefined
  const angles:number[] = []
  chain.bones.forEach((bone, index) => {
    if (index < 1) return
    if (vrmBones[index-1]) {
      const direction = new THREE.Vector3(bone.end.x, bone.end.y, bone.end.z).sub(
        new THREE.Vector3(bone.start.x, bone.start.y, bone.start.z)
      ).normalize();
      let prevDirection = originDirection
      if (prevBone){
        prevDirection = new THREE.Vector3(prevBone.end.x, prevBone.end.y, prevBone.end.z).sub(
          new THREE.Vector3(prevBone.start.x, prevBone.start.y, prevBone.start.z)
        ).normalize();
      }
      prevBone = bone
      prevDirection.y *= -1
      direction.y *= -1
      const quaternion = new THREE.Quaternion().setFromUnitVectors(prevDirection, direction);
      angles.push(normV([quaternion.x, quaternion.y, quaternion.z]))
      vrmBones[index-1]?.quaternion.slerp(quaternion, 0.5);
    }else{
      console.log(`vrmBones[${index}] undefined`)
    }
  });
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

export function applyFikToVrm(vrm:VRM, structure:Structure3DEx){
  //  Use Kalaido kit for body trunk.
  if (structure.hips){
    const rotHip = {...structure.hips.Hips.rotation!}
    const rotSpine = {...structure.hips.Spine}
    rotHip.y *= -1;     rotHip.z *= -1
    rotSpine.y *= -1;   rotSpine.z *= -1
    rigRotation(vrm, "hips", rotHip, 0.7);
    rigRotation(vrm, "chest", rotSpine, 0.25, .3);
    rigRotation(vrm, "spine", rotSpine, 0.45, .3);
  }
  if (structure.face){
    applyFaceRigToVrm(vrm, structure.face)
  }

  //  use FullIK for arms
  const nodes = getVRMIKTargets(vrm)
  applyChainToVrmBones(nodes[0], structure.chains[0], new THREE.Vector3(1,0,0))
  applyChainToVrmBones(nodes[1], structure.chains[1], new THREE.Vector3(-1,0,0))
}
