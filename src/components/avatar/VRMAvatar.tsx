import {RawParticipantProps} from '../map/Participant/Participant'
import * as THREE from 'three'
import {GLTF, GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader'
import {VRM} from '@pixiv/three-vrm'
import React from 'react'
import { PARTICIPANT_SIZE } from '@models/Participant'
import { autorun } from 'mobx'


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
}

const size = [150,300]

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
    renderer.setPixelRatio(window.devicePixelRatio)

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
    let vrm:VRM|undefined
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
        if (vrm){
          scene.remove(vrm.scene)
        }
        VRM.from(gltf).then(vrmGot => {
          vrm = vrmGot
          scene.add(vrm.scene)
          vrm.scene.rotation.y = Math.PI
          if (memberRef.current){
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
    render(props.participant.pose.orientation, memberRef.current?.renderRequest)
  }, [props.participant.pose.orientation, memberRef.current?.renderRequest])

  return <>
    <canvas style={{
      pointerEvents:'none',
      position:'relative',
      width:size[0], height:size[1],
      left: -size[0]/2, top:-(size[1] - PARTICIPANT_SIZE/2)
      }} ref={ref}/>
  </>
}
