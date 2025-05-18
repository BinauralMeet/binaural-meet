import { ParticipantBase} from '@models/Participant'
import { mulV, normV} from './coordinates'
import { VRM, VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { addV, subV } from 'react-use-gesture'
import { makeObservable, observable } from 'mobx'
import { createStrcture3DEx, drawFikStructure, FikStructure3DEx, updateStructure3DEx, setRestingPoseToVrm, AllLandmarks } from './vrmIK'

declare const d:any                  //  from index.html


export interface VRMAvatar{
  participant: ParticipantBase
  name: string
  avatarSrc: string
  vrm: VRM
  nameLabel?:THREE.Sprite
  nameLabelOuter?:THREE.Sprite
  dispo?: ()=>void
  structure?: FikStructure3DEx
}
export class VRMAvatars{
  @observable remotes = new Map<string, VRMAvatar>
  @observable.ref local?: VRMAvatar
  constructor(){
    makeObservable(this)
    d.vrmAvatars = this
  }
  disposeVrmAvatar(avatar: VRMAvatar){
    if (avatar.dispo) avatar.dispo()
    delete avatar.dispo
    freeVrm(avatar.vrm)
    freeNameLabel(avatar)
  }
  public delete(isLocal:boolean, pid?: string){
    if (isLocal){
      if (this.local) {
        this.disposeVrmAvatar(this.local)
        this.local = undefined
      }
    }
    else{
      const remote = this.remotes.get(pid!)
      if (remote){
        this.disposeVrmAvatar(remote)
        this.remotes.delete(pid!)
      }
    }
  }
}

export function freeScene(scene: THREE.Scene | THREE.Group){
  scene.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.geometry.dispose()
      if (Array.isArray(obj.material)) {
        obj.material.forEach(mat => {
          if (mat.map) mat.map.dispose()
          mat.dispose()
        })
      } else {
        if (obj.material.map) obj.material.map.dispose()
        obj.material.dispose()
      }
    }
    if (obj instanceof THREE.Light) {
      obj.dispose()
    }
  })
}
export function freeVrm(vrm: VRM){
  freeScene(vrm.scene)
}
function freeNameLabel(avatar:VRMAvatar){
  avatar.nameLabel?.material.map?.dispose()
  avatar.nameLabel?.material.dispose()
  avatar.nameLabel?.geometry.dispose()
  delete avatar.nameLabel
  avatar.nameLabelOuter?.material.map?.dispose()
  avatar.nameLabelOuter?.material.dispose()
  avatar.nameLabelOuter?.geometry.dispose()
  delete avatar.nameLabelOuter
}

function addCooridateArraw(vrm: VRM){
  //  add coordinate arrows at right hand
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
}

function updateNameLabel(avatar:VRMAvatar, participant: ParticipantBase){
  if (!avatar.nameLabel || avatar.name !== participant.information.name){
    if (avatar.nameLabel){
      freeNameLabel(avatar)
    }
    createNameLabel(avatar, participant)
  }
  if (avatar.nameLabel && avatar.nameLabelOuter){
    avatar.nameLabel.position.y = -avatar.vrm.scene.position.y + 0.9
    avatar.nameLabelOuter.position.y = -avatar.vrm.scene.position.y + 0.9
  }
}

export function updateVrmAvatar(avatar:VRMAvatar|undefined, participant: ParticipantBase){
  const promise = new Promise<VRMAvatar>((resolve, reject)=>{
    if (avatar?.avatarSrc !== participant.information.avatarSrc){
      if (avatar?.vrm){
        freeVrm(avatar.vrm)
      }
      //  console.log(`loadVrm ${participant.information.avatarSrc.substring(participant.information.avatarSrc.lastIndexOf('/'))}`)
      loadVrmAvatar(participant).then((vrm)=>{
        setRestingPoseToVrm(vrm)
        const newAvatar:VRMAvatar = {
          name: '',
          avatarSrc: participant.information.avatarSrc,
          vrm,
          participant,
        }
        if (!avatar) avatar = newAvatar
        else Object.assign(avatar, newAvatar)
        updateNameLabel(avatar, participant)
        //  console.log(`avatar for ${participant.id} loaded.`)
        resolve(avatar)
      })
    }else{
      updateNameLabel(avatar, participant)
      resolve(avatar)
    }
  })
  return promise
}

function roundRectPath(path:Path2D, x:number, y:number, width:number, height:number, radius:number){
  path.moveTo(x, y + radius);
  path.arcTo(x, y + height, x + radius, y + height, radius);
  path.arcTo(x + width, y + height, x + width, y + height - radius, radius);
  path.arcTo(x + width, y, x + width - radius, y, radius);
  path.arcTo(x, y, x, y + radius, radius);
}

function fillRoundedRect(vas:CanvasRenderingContext2D, x:number, y:number, width:number, height:number, radius:number) {
  const path = new Path2D()
  roundRectPath(path, x, y, width, height, radius)
  vas.fill(path, "evenodd")
}
function fillRoundedRectOuter(vas:CanvasRenderingContext2D, x:number, y:number, width:number, height:number, radOut:number, radIn:number, thickness:number) {
  const path = new Path2D()
  roundRectPath(path, x, y, width, height, radOut)
  roundRectPath(path, x + thickness, y + thickness, width-2*thickness, height-2*thickness, radIn)
  vas.fill(path, "evenodd")
}
function createNameLabel(avatar:VRMAvatar, participant: ParticipantBase){
  const colors = participant.getColor()
  const fontSize = 30;
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) return
  context.font = `${fontSize}px Arial`;
  const textSize = context.measureText(participant.information.name)
  canvas.width = textSize.width + 8
  canvas.height = (fontSize + 8)
  //console.log(`w: ${canvas.width} h:${canvas.height} `)
  context.fillStyle = colors[0]
  fillRoundedRect(context, 0, 0, canvas.width, canvas.height, 8)
  context.fillStyle = colors[1]
  context.font = `${fontSize}px Arial`
  context.fillText(participant.information.name, 4, canvas.height-8, canvas.width)
  const texture = new THREE.CanvasTexture(canvas)
  const material = new THREE.SpriteMaterial({ map: texture , depthTest:false})
  const sprite = new THREE.Sprite(material)
  const scale = 0.15
  sprite.scale.set(canvas.width/canvas.height*scale, scale, 1)
  canvas.remove()
  avatar.name = participant.information.name
  avatar.nameLabel = sprite

  //  outer
  const canvas2 = document.createElement('canvas');
  const context2 = canvas2.getContext('2d');
  if (!context2) return
  canvas2.width = canvas.width + 16
  canvas2.height = canvas.height + 16
  context2.fillStyle = 'cyan'
  fillRoundedRectOuter(context2, 0, 0, canvas2.width, canvas2.height, 12, 8, 8)
//  context.fillStyle = 'rgba(0,0,0,0)'
//  fillRoundedRect(context, 8, 8, canvas.width-16, canvas.height-16, 10)
  const texture2 = new THREE.CanvasTexture(canvas2)
  const material2 = new THREE.SpriteMaterial({ map: texture2 , depthTest:false})
  const sprite2 = new THREE.Sprite(material2)
  const scale2 = scale * canvas2.height / canvas.height
  sprite2.scale.set(canvas2.width/canvas2.height*scale2, scale2, 1)
  canvas2.remove()
  avatar.nameLabelOuter = sprite2
}

function replaceTextureColor(vrm: VRM, colorBase:number[], colorTo:number[]){
  const bodyColor = mulV(1.0/255.0, colorTo)
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256
  const context = canvas.getContext('2d');
  if (context){
    const tex = (vrm.materials![0] as any).map as THREE.Texture
    context.drawImage(tex.image, 0, 0)
    const image = context.getImageData(0,0, 256,256)
    const base = mulV(1.0/255.0, colorBase)
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

let loader: GLTFLoader
function loadVrmAvatar(participant: ParticipantBase){
  const promise = new Promise<VRM>((resolve, reject)=>{
    if (!loader){
      loader = new GLTFLoader()
      loader.register(parser => new VRMLoaderPlugin(parser))
    }
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
        if (participant.information.avatarSrc==='https://binaural.me/public_packages/uploader/vrm/avatar/256Chinchilla.vrm'){
          //  Replace texture's main color to the participant's color
          replaceTextureColor(vrm, [127, 127, 127], participant.getColorRGB())
        }
        resolve(vrm)
      },
    )
  })
  return promise
}


export function applyMPLandmarkToVrm(avatar:VRMAvatar, landmarks: AllLandmarks|undefined, c2dDebug?: CanvasRenderingContext2D){
  if (!avatar.vrm) return
  if (landmarks){
    if (!avatar.structure){
      avatar.structure = createStrcture3DEx(avatar.vrm)
    }
    updateStructure3DEx(avatar.vrm, avatar.structure, landmarks)

    if (c2dDebug){    //  debug drawing for FIK
      drawFikStructure(avatar.structure, landmarks, c2dDebug)
    }
  }
}

export function freeRenderTarget(target: THREE.WebGLRenderTarget) {
  if (target.texture) {
    target.texture.dispose();
  }
  target.dispose();
}
