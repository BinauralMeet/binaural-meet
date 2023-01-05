import * as THREE from 'three'
import {GLTF, GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader'
import {VRM, VRMSchema, VRMUtils} from '@pixiv/three-vrm'
import React from 'react'
import { ParticipantBase, PARTICIPANT_SIZE, VRMRigs } from '@models/Participant'
import { autorun, IReactionDisposer } from 'mobx'
import * as Kalidokit from 'kalidokit'
import { throttle } from 'lodash'
import Euler from 'kalidokit/dist/utils/euler'


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
  clock: THREE.Clock
  renderer: THREE.WebGLRenderer
  scene: THREE.Scene
  camera: THREE.Camera
  vrm?:VRM
}

const size = [150,300]


export const VRMAvatar: React.FC<{participant:ParticipantBase}> = (props: {participant:ParticipantBase}) => {
  const ref = React.useRef<HTMLCanvasElement>(null)
  const memberRef = React.useRef<Member|null>(null)

  React.useEffect(()=>{
    if (!ref.current) return
    memberRef.current = {
      clock:new THREE.Clock(),
      renderer : new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        canvas: ref.current
      }),
      camera: new THREE.PerspectiveCamera(
        35,
        size[0]/size[1],
        0.1,
        1000,
      ),
      scene: new THREE.Scene(),
    }
    const mem = memberRef.current!
    mem.renderer.setSize(size[0], size[1])
    mem.renderer.setPixelRatio(window.devicePixelRatio * 4)

    const light = new THREE.DirectionalLight(0xffffff)
    light.position.set(1, 1, 1).normalize()
    mem.scene.add(light)

    /*  //  show grid
    const gridHelper = new THREE.GridHelper(10, 10)
    scene.add(gridHelper)
    gridHelper.visible = true

    let geometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);// 立方体
    let material = new THREE.MeshLambertMaterial({color: 0x00ddff});// 影が表示される
    const cube = new THREE.Mesh(geometry, material);// それらをまとめて3Dオブジェクトにします
    scene.add(cube);

    // show axis
    const axesHelper = new THREE.AxesHelper(0.5)
    scene.add(axesHelper)
    //  */
    const loader = new PromiseGLTFLoader()
    const dispo: IReactionDisposer[] = []

    //  load VRM from avatarSrc
    dispo.push(autorun(()=>{
      const mem = memberRef.current!
      loader.promiseLoad(
          props.participant.information.avatarSrc,
      ).then(gltf => {
        if (mem.vrm){
          mem.scene?.remove(mem.vrm.scene)
        }
        VRMUtils.removeUnnecessaryJoints(gltf.scene);
        VRM.from(gltf).then(vrmGot => {
          mem.scene?.add(vrmGot.scene)
          vrmGot.scene.rotation.y = Math.PI
          if (mem){
            mem.vrm = vrmGot
            render3d(props.participant.pose.orientation, props.participant.vrmRigs)
          }
        })
      }).catch((e)=>{
        console.log('Failed to load VRM', e)
      })
    }))

    //  render when updated
    const render3d = throttle((ori, rig)=>{
      if (mem?.vrm) {
        vrmSetPose(mem.vrm, rig)                //  apply rig
        mem.vrm.update(mem.clock.getDelta());   //  Update model to render physics
        const rad = ori / 180 * Math.PI
        //mem.camera?.position.set(-Math.sin(rad)*3, 2, -Math.cos(rad)*3)
        //mem.camera?.lookAt(0,0.93,0)
        mem.camera?.position.set(-Math.sin(rad)*3, 0.8, -Math.cos(rad)*3)
        mem.camera?.lookAt(0,0.8,0)
        mem.renderer?.render(mem.scene!, mem.camera!)
      }
    }, 1000/20)
    dispo.push(autorun(()=>{
      render3d(props.participant.pose.orientation, props.participant.vrmRigs)
    }))

    return ()=>{
      for(const d of dispo) d()
    }
    //  eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <>
    <canvas style={{
      pointerEvents:'none',
      position:'relative',
      width:size[0], height:size[1],
      left: -size[0]/2, top:-(size[1] - PARTICIPANT_SIZE/4)
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
function vrmSetPose (vrm:VRM, rigs?:VRMRigs){
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
