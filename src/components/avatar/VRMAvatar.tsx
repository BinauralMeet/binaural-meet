import {RawParticipantProps} from '../map/Participant/Participant'
import * as THREE from 'three'
import {GLTF, GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader'
import {VRM, VRMSchema} from '@pixiv/three-vrm'
import React from 'react'
import { PARTICIPANT_SIZE, VRMRigs } from '@models/Participant'
import { autorun } from 'mobx'
import * as Kalidokit from 'kalidokit'


class PromiseGLTFLoader extends GLTFLoader {
  promiseLoad(
    url: string,
    onProgress?: ((event: ProgressEvent<EventTarget>) => void) | undefined,
  ) {
    return new Promise<GLTF>((resolve, reject) => {
      super.load(url, resolve, onProgress, reject)
    })
  }
}
interface Member{
  renderer: THREE.WebGLRenderer
  scene: THREE.Scene
  camera: THREE.Camera
  orientation: number
  renderRequest: boolean
  vrm?:VRM
}

const size = [150,300]
const resolution = [300,600]

export const VRMAvatar: React.FC<RawParticipantProps> = (props: RawParticipantProps) => {
  const ref = React.useRef<HTMLCanvasElement>(null)
  const memberRef = React.useRef<Member|null>(null)

  React.useEffect(()=>{
    if (!ref.current) return
    //console.log(`useEffect for 3js called.`)
    // レンダラーの設定
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      canvas: ref.current
    })
    renderer.setSize(size[0], size[1])
    renderer.setPixelRatio(window.devicePixelRatio * 4)

    // カメラの設定
    const camera = new THREE.PerspectiveCamera(
      35,
      size[0]/size[1],
      0.1,
      1000,
    )

    // シーンの設定
    const scene = new THREE.Scene()

    // ライトの設定
    const light = new THREE.DirectionalLight(0xffffff)
    light.position.set(1, 1, 1).normalize()
    scene.add(light)
    memberRef.current = {renderer, camera, scene, orientation:0, renderRequest:false}

    // グリッドを表示
    /*
    const gridHelper = new THREE.GridHelper(10, 10)
    scene.add(gridHelper)
    gridHelper.visible = true

    let geometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);// 立方体
    let material = new THREE.MeshLambertMaterial({color: 0x00ddff});// 影が表示される
    const cube = new THREE.Mesh(geometry, material);// それらをまとめて3Dオブジェクトにします
    scene.add(cube);

    // 座標軸を表示
    const axesHelper = new THREE.AxesHelper(0.5)
    scene.add(axesHelper)
    //  */
    const loader = new PromiseGLTFLoader()
    const dispo = autorun(()=>{
      loader.promiseLoad(
        props.participant.information.avatarSrc,
        /*progress => {
          console.log(
            'Loading model...',
            100.0 * (progress.loaded / progress.total),
            '%',
          )
        },*/
      ).then(gltf => {
        if (memberRef.current?.vrm){
          scene.remove(memberRef.current.vrm.scene)
        }
        VRM.from(gltf).then(vrmGot => {
          scene.add(vrmGot.scene)
          vrmGot.scene.rotation.y = Math.PI
          if (memberRef.current){
            memberRef.current.vrm = vrmGot
            memberRef.current.renderRequest = true
          }
        })
      })
    })
    return ()=>{
      dispo()
    }
  }, [])

  function render(ori:number, forceRerender?: boolean){
    const mem = memberRef.current
    if (mem && (Math.abs(mem.orientation - ori) > 5 || forceRerender)){
      mem.orientation = ori
      const rad = ori / 180 * Math.PI
      mem.camera.position.set(-Math.sin(rad)*3, 2, -Math.cos(rad)*3)
      mem.camera.lookAt(0,0.93,0)
      mem.renderer.render(mem.scene, mem.camera)
      mem.renderRequest = false
      //  console.log('rendered')
    }
  }
  React.useEffect(()=>{
    if (memberRef.current?.vrm && props.participant.vrmRigs){
      animateVRM(memberRef.current.vrm, props.participant.vrmRigs)
    }
    render(props.participant.pose.orientation, memberRef.current?.renderRequest || props.participant.vrmRigs!==undefined)
  }, [props.participant.pose.orientation, memberRef.current?.renderRequest, props.participant.vrmRigs])

  return <>
    <canvas style={{
      pointerEvents:'none',
      position:'relative',
      width:size[0], height:size[1],
      left: -size[0]/2, top:-(size[1] - PARTICIPANT_SIZE/2)
      }} ref={ref}/>
  </>
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

// Animate Position Helper Function
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
};

let oldLookTarget = new THREE.Euler()
function rigFace(vrm:VRM, riggedFace:Kalidokit.TFace){
    if(!vrm){return}
    rigRotation(vrm, "Neck", riggedFace.head, 0.7);

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
function animateVRM (vrm:VRM, rigs:VRMRigs){
  if (!vrm) {
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
  if (rigs.leftHand){
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
  vrm.springBoneManager?.lateUpdate(0.1)
  vrm.blendShapeProxy?.update()
};
