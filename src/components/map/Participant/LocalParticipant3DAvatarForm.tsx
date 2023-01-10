import { BMProps } from '@components/utils'
import Box from '@material-ui/core/Box'
import Button from '@material-ui/core/Button'
import DialogContent from '@material-ui/core/DialogContent'
import DialogTitle from '@material-ui/core/DialogTitle'
import Popover, { PopoverOrigin, PopoverReference } from '@material-ui/core/Popover'
import {useTranslation} from '@models/locales'
import {isSmartphone} from '@models/utils/utils'
import React, {useEffect, useState} from 'react'
import {VRM, VRMSchema, VRMUtils} from '@pixiv/three-vrm'
import * as THREE from 'three'
import {GetPromiseGLTFLoader} from '@models/api/GLTF'


export interface LocalParticipantFormProps extends BMProps{
  open: boolean
  anchorEl: HTMLElement | null
  anchorOrigin: PopoverOrigin
  close: () => void,
  anchorReference?: PopoverReference
}

const tfIStyle = {fontSize: isSmartphone() ? '2em' : '1em',
height: isSmartphone() ? '2em' : '1.5em'}
const tfDivStyle = {height: isSmartphone() ? '4em' : '3em'}
const tfLStyle = {fontSize: isSmartphone() ? '1em' : '1em'}
const iStyle = {fontSize: isSmartphone() ? '2.5rem' : '1rem'}


interface VRMContext{
  id: string
  canvasRef: React.RefObject<HTMLCanvasElement>,
  scene: THREE.Scene
  camera: THREE.Camera
  renderer?: THREE.WebGLRenderer
  vrm?:VRM
}
interface Member{
  files: string[]
  contexts: VRMContext[]
}

export const Choose3DAvatar: React.FC<LocalParticipantFormProps> = (props: LocalParticipantFormProps) => {
  const {close, ...popoverProps} = props
  const {t} = useTranslation()
  function close3D(ev:Object, reason:string) {
    if (reason === 'enter' || reason==='backdropClick'){
    }
    props.close()
  }

  const ref = React.useRef<HTMLCanvasElement>(null)
  const memberRef = React.useRef<Member|null>(null)

  const vrmUrlBase = 'https://binaural.me/public_packages/uploader/vrm/'

  useEffect(()=>{
    if (!memberRef.current) return
    const mem = memberRef.current
    const vrmUrl = `${vrmUrlBase}index.php?files`
    const req = new XMLHttpRequest();
    req.onload = (e) => {
      const text = req.responseText
      mem.files = JSON.parse(text)
    };
    req.open("GET", vrmUrl);
    req.send();
  },[memberRef.current])

  const size = [150,300]
  useEffect(()=>{
    if (!memberRef.current){
      memberRef.current = {
        files:[],
        contexts:[]
      }
    }
    const mem = memberRef.current
    const loader = GetPromiseGLTFLoader()

    mem.files.forEach(file=>{
      let context:VRMContext|undefined = mem.contexts.find(c => c.id === file)
      if (!context){
        context = {
          id: file,
          canvasRef: React.createRef<HTMLCanvasElement>(),
          camera: new THREE.PerspectiveCamera(
            35,
            size[0]/size[1],
            0.1,
            1000,
          ),
          scene: new THREE.Scene(),
        }
        const light = new THREE.DirectionalLight(0xffffff)
        light.position.set(1, 1, 1).normalize()
        context.scene.add(light)
        loader.promiseLoad(`${vrmUrlBase}${file}`).then(gltf => {
          if (context?.vrm){ context.scene?.remove(context.vrm.scene) }
          VRMUtils.removeUnnecessaryJoints(gltf.scene);
          VRM.from(gltf).then(vrmGot => {
            context?.scene?.add(vrmGot.scene)
            vrmGot.scene.rotation.y = Math.PI
            if (context){
              context.vrm = vrmGot
            }
          })
        })
      }
    })

    //  render when updated
    //  eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memberRef.current?.files])


  const mem = memberRef.current
  const list = mem?.contexts.map((ctx)=>{

  return <Box>
      {ctx.id}
    </Box>
  })

  return <Popover {...popoverProps}>
    <DialogTitle>
      <span  style={{fontSize: isSmartphone() ? '2.5em' : '1em'}}>
        {t('lsTitle3D')}
      </span>
    </DialogTitle>
    <DialogContent>
      {list}
      <Box mt={4} mb={3}>
        <Button variant="contained" color="primary" style={{marginLeft:15, textTransform:'none'}}
          onClick={()=>{ close3D({}, 'cancel')}}>
          {t('btClose')}</Button>
      </Box>
    </DialogContent>
  </Popover>
}
