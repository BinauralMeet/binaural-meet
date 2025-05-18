import {dialogStyle, titleStyle } from '@components/utils'
import Button from '@material-ui/core/Button'
import DialogContent from '@material-ui/core/DialogContent'
import DialogTitle from '@material-ui/core/DialogTitle'
import Popover, { PopoverOrigin, PopoverReference } from '@material-ui/core/Popover'
import {useTranslation} from '@models/locales'
import React, {useEffect} from 'react'
import {VRM, VRMLoaderPlugin} from '@pixiv/three-vrm'
import * as THREE from 'three'
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader'
import { participants } from '@stores/index'
import {formLog} from '@models/utils'
import { freeScene, freeVrm } from '@models/utils/vrm'
import { ImageSearch } from '@material-ui/icons'

export interface LocalParticipantFormProps{
  open: boolean
  anchorEl: HTMLElement | null
  anchorOrigin: PopoverOrigin
  close: () => void,
  anchorReference?: PopoverReference
}

class AvatarImage{
  id: string
  imgRef: React.RefObject<HTMLImageElement> = React.createRef<HTMLImageElement>()
  constructor(file:string){
    this.id = file
  }
}
interface Member{
  files: string[]
  images: AvatarImage[]
}

function render3d(ctx: AvatarImage, vrm: VRM, size: number[]){
  const img = ctx.imgRef.current
  if (img){
    const canvas = document.createElement('canvas')
    canvas.width = size[0]
    canvas.height = size[1]
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      canvas
    })

    const scene = new THREE.Scene()
    const light = new THREE.DirectionalLight(0xffffff)
    light.position.set(1, 1, 1).normalize()
    scene.add(light)
    scene.add(vrm.scene)

    const rad = (180 + 20) / 180 * Math.PI
    const camera = new THREE.PerspectiveCamera(
      35,
      avatarSize[0]/avatarSize[1],
      0.1,
      1000,
    )
    camera.position.set(-Math.sin(rad)*3, 0.8, -Math.cos(rad)*3)
    camera.lookAt(0,0.8,0)
    renderer.setSize(size[0], size[1])
    renderer.setPixelRatio(window.devicePixelRatio * 4)
    renderer.render(scene, camera)
    formLog()(`render ${ctx.id}`)

    //  remove
    const url = canvas.toDataURL()
    canvas.remove()

    freeVrm(vrm)
    freeScene(scene)
    renderer.getRenderTarget()?.dispose()
    renderer.setRenderTarget(null)
    renderer.forceContextLoss()
    if (renderer) {
      renderer.dispose()
    }
    img.src = url
  }
}

export const vrmUrlBase = 'https://binaural.me/public_packages/uploader/vrm/avatar/'
const avatarSize = [150,200]

function getVRMLoader() {
  const loader = new GLTFLoader();
  loader.register((parser) => {
    return new VRMLoaderPlugin(parser)
  });
  return loader;
}

function loadFile(mem: Member){
  const loader = getVRMLoader()
  formLog()(`files: ${mem.files}`)

  for(const file of mem.files){
    let aimg:AvatarImage|undefined = mem.images.find(c => c.id === file)
    if (aimg) continue
    aimg = new AvatarImage(file)
    loader.load(`${vrmUrlBase}${file}`, (gltf) => {
      formLog()(`${file} loaded.`)
      if (!aimg) return
      const vrm = gltf.userData.vrm;
      if (!vrm) return;
      vrm.scene.rotation.y = Math.PI
      render3d(aimg, vrm, avatarSize)
      formLog()(`${file} vrm got.`)
    }, undefined, (error) => {
      console.error('Failed to load VRM file:', error)
    })
    mem.images.push(aimg)
  }
}

export const Choose3DAvatar: React.FC<LocalParticipantFormProps> = (props: LocalParticipantFormProps) => {
  const {close, ...popoverProps} = props
  const {t} = useTranslation()
  function close3D(ev:Object, reason:string) {
    if (reason === 'enter' || reason==='backdropClick'){
    }
    props.close()
  }

  const [list, setList] = React.useState<JSX.Element[]|undefined>()
  const memberRef = React.useRef<Member|null>(null)

  useEffect(()=>{
    if (!memberRef.current){
      memberRef.current = {
        files:[],
        images:[],
      }
    }
    const mem = memberRef.current
    const vrmUrl = `${vrmUrlBase}index.php?files`
    const req = new XMLHttpRequest();
    req.onload = (e) => {
      const text = req.responseText
      mem.files = JSON.parse(text)
      loadFile(mem)
      setList(mem?.images.map((aimg)=>{
        return <div key={aimg.id} style={{ display:'inline-block', padding:'0 10 0 10',
          width:avatarSize[0], overflowWrap:'break-word'}}>
          <Button variant="contained" style={{width:avatarSize[0], height:avatarSize[1], textTransform:'none'}}
            onClick={(ev)=>{
              const local = participants.local
              local.information.email=`${vrmUrlBase}${aimg.id}`
              close3D(ev, 'enter')
            }}>
            <img alt='loading' style={{
              pointerEvents:'none',
              width:avatarSize[0], height:avatarSize[1],
            }} ref={aimg.imgRef}/><br />
          </Button>
          {aimg.id}
        </div>
      }) )
    };
    req.open("GET", vrmUrl);
    req.send();

    return () => {
      mem.images.forEach(aimg => {
        if (aimg.imgRef.current){
          aimg.imgRef.current.src=''
          aimg.imgRef.current.remove()
        }
      })
      mem.images = []
      mem.files = []
    }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <Popover {...popoverProps} style={dialogStyle} onWheelCapture={(ev)=>{ev.stopPropagation()}} onClose={()=>close3D({}, 'cancel')}>
    <DialogTitle >
      <span style={titleStyle}>
        {t('lsTitle3D')}
      </span>&nbsp;
      <Button variant="contained" color="primary"
        style={{marginLeft:15, textTransform:'none', display:'inline-block'}}
        onClick={()=>{ close3D({}, 'cancel')}}>
        {t('btClose')}</Button>
    </DialogTitle>
    <DialogContent>
      <div style={{display:'flex', flexWrap:'wrap', alignItems:'top', gap:'10px 10px'}}>
        {list}
      </div>
    </DialogContent>
  </Popover>
}
