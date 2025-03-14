import {dialogStyle, titleStyle } from '@components/utils'
import Button from '@material-ui/core/Button'
import DialogContent from '@material-ui/core/DialogContent'
import DialogTitle from '@material-ui/core/DialogTitle'
import Popover, { PopoverOrigin, PopoverReference } from '@material-ui/core/Popover'
import {useTranslation} from '@models/locales'
import React, {useEffect} from 'react'
import {VRM, VRMUtils} from '@pixiv/three-vrm'
import * as THREE from 'three'
import {GetPromiseGLTFLoader} from '@models/api/GLTF'
import {IReactionDisposer, autorun, makeObservable, observable} from 'mobx'
import { participants } from '@stores/index'
import {formLog} from '@models/utils'

export interface LocalParticipantFormProps{
  open: boolean
  anchorEl: HTMLElement | null
  anchorOrigin: PopoverOrigin
  close: () => void,
  anchorReference?: PopoverReference
}

class VRMContext{
  id: string
  @observable.shallow imgRef: React.RefObject<HTMLImageElement> = React.createRef<HTMLImageElement>()
  @observable.ref vrm?: VRM
  disposer?: IReactionDisposer
  constructor(file:string){
    this.id = file
    makeObservable(this)
  }
}
interface Member{
  files: string[]
  contexts: VRMContext[]
}

let canvas:HTMLCanvasElement|undefined
let renderer:THREE.WebGLRenderer|undefined
function getImage(ctx:VRMContext, size: number[]){
  if (!canvas){
    canvas = document.createElement('canvas')
    canvas.width = size[0]
    canvas.height = size[1]
    renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      canvas
    })
  }

  if(ctx.vrm && renderer){
    const scene = new THREE.Scene()
    const light = new THREE.DirectionalLight(0xffffff)
    light.position.set(1, 1, 1).normalize()
    scene.add(light)
    scene.add(ctx.vrm.scene)

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
  }
  return canvas.toDataURL()
}

export const vrmUrlBase = 'https://binaural.me/public_packages/uploader/vrm/avatar/'
const avatarSize = [150,200]
function loadFile(mem: Member, size: number[]){
  const loader = GetPromiseGLTFLoader()
  formLog()(`files: ${mem.files}`)

  for(const file of mem.files){
    let ctx:VRMContext|undefined = mem.contexts.find(c => c.id === file)
    if (ctx) continue
    ctx = new VRMContext(file)
    ctx.disposer = autorun(()=>{
      if (ctx){
        render3d(ctx, avatarSize)
      }
    })
    loader.promiseLoad(`${vrmUrlBase}${file}`).then(gltf => {
      formLog()(`${file} loaded.`)
      if (!ctx) return
      VRMUtils.removeUnnecessaryJoints(gltf.scene);
      VRM.from(gltf).then(vrmGot => {
        if (!ctx) return
        formLog()(`${file} vrm got.`)
        vrmGot.scene.rotation.y = Math.PI
        ctx.vrm = vrmGot
      })
    })
    mem.contexts.push(ctx)
  }
}
function render3d(ctx: VRMContext, size: number[]){
  const img = ctx.imgRef.current
  if (img){
    img.src = getImage(ctx, size)
  }
}

export const Choose3DAvatar: React.FC<LocalParticipantFormProps> = (props: LocalParticipantFormProps) => {
  const {close, ...popoverProps} = props
  const {t} = useTranslation()
  function close3D(ev:Object, reason:string) {
    if (reason === 'enter' || reason==='backdropClick'){
    }
    props.close()
    /*  Not worked.
    memberRef.current?.contexts.forEach(ctx => {
      if (ctx.imgRef.current){
        ctx.imgRef.current.src='data:image/svg+xml,%3Csvg%3E%3Ctext%3Enow loading...%3C/text%3E%3C/svg%3E'
      }
    })*/
  }

  const [list, setList] = React.useState<JSX.Element[]|undefined>()
  const memberRef = React.useRef<Member|null>(null)

  useEffect(()=>{
    if (!memberRef.current){
      memberRef.current = {
        files:[],
        contexts:[],
      }
    }
    const mem = memberRef.current
    const vrmUrl = `${vrmUrlBase}index.php?files`
    const req = new XMLHttpRequest();
    req.onload = (e) => {
      const text = req.responseText
      //  formLog()(`onload ${text}`)
      mem.files = JSON.parse(text)
      loadFile(mem, avatarSize)
      setList(mem?.contexts.map((ctx)=>{
        return <div key={ctx.id} style={{ display:'inline-block', padding:'0 10 0 10',
          width:avatarSize[0], overflowWrap:'break-word'}}>
          <Button variant="contained" style={{width:avatarSize[0], height:avatarSize[1], textTransform:'none'}}
            onClick={(ev)=>{
              const local = participants.local
              local.information.email=`${vrmUrlBase}${ctx.id}`
              close3D(ev, 'enter')
            }}>
            <img alt='loading' style={{
              pointerEvents:'none',
              width:avatarSize[0], height:avatarSize[1],
            }} ref={ctx.imgRef}/><br />
          </Button>
          {ctx.id}
        </div>
      }) )
    };
    req.open("GET", vrmUrl);
    req.send();
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
