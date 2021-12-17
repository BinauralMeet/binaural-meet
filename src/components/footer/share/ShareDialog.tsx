import {BMProps} from '@components/utils'
import Dialog from '@material-ui/core/Dialog'
import DialogContent from '@material-ui/core/DialogContent'
import DialogTitle from '@material-ui/core/DialogTitle'
import {useTranslation} from '@models/locales'
import {isSmartphone} from '@models/utils'
import {createContentOfIframe, createContentOfText} from '@stores/sharedContents/SharedContentCreator'
import sharedContents from '@stores/sharedContents/SharedContents'
import React, {useRef, useState} from 'react'
import {CameraSelector} from './CameraSelector'
import {CameraSelectorMember} from './CameraSelector'
import { GoogleDriveImport } from './GoogleDrive'
import {ImageInput} from './ImageInput'
import {ShareMenu} from './Menu'
import {Step} from './Step'
import {TextInput} from './TextInput'

interface ShareDialogProps extends BMProps{
  open: boolean
  onClose: () => void
}

export const ShareDialog: React.FC<ShareDialogProps> = (props) => {
  const {open, onClose} = props
  const {map} = props.stores

  const cameras = useRef(new CameraSelectorMember())

  const [step, setStep] = useState<Step>('menu')

  const wrappedSetStep = (step: Step) => {
    if (step === 'none') {
      onClose()
    } else {
      setStep(step)
    }
  }
  function getPage(step: Step, setStep: (step: Step) => void): JSX.Element | undefined {
    switch (step) {
      case 'menu':
        return <ShareMenu {...props} setStep={setStep} cameras={cameras.current} />
      case 'text':
        return <TextInput stores={props.stores}
            setStep={setStep}
            onFinishInput={(value) => {
              sharedContents.shareContent(createContentOfText(value, map))
              //  console.debug(`share text: ${value}`)
            }}
            textLabel = "Text"
            multiline = {true}
          />
      case 'iframe':
        return <TextInput stores={props.stores}
            setStep={setStep}
            onFinishInput={(value) => {
              createContentOfIframe(value, map).then((c) => {
                sharedContents.shareContent(c)
              })
            }}
            textLabel = "URL"
            multiline = {false}
          />
      case 'image':
        return <ImageInput setStep={setStep} stores={props.stores}/>
      case 'camera':
        return <CameraSelector setStep={setStep} stores={props.stores} cameras={cameras.current} />
      case 'Gdrive':
        return <GoogleDriveImport
        stores={props.stores}
        setStep={setStep} onSelectedFile={(value) => {
          createContentOfIframe(value, map).then((c) => {
            sharedContents.shareContent(c)
          })
        }} />
      default:
        throw new Error(`Unknown step: ${step}`)
    }
  }

  //  console.debug(`step=${step}, pasteEnabled=${sharedContents.pasteEnabled}`)
  sharedContents.pasteEnabled = step === 'none' || step === 'menu'

  const {t} = useTranslation()
  const stepTitle: {
    [key: string]: string,
  } = {
    menu: t('Create and Share'),
    text: t('Share Text'),
    iframe: t('Share iframe'),
    image: t('Share image'),
    none: 'None',
    camera: t('Select video camera to share'),
  }
  const title = stepTitle[step]
  const page: JSX.Element | undefined = getPage(step, wrappedSetStep)

  return  <Dialog open={open} onClose={onClose} onExited={() => setStep('menu')} maxWidth="sm"
      onPointerMove = {(ev) => {
        map.setMouse([ev.clientX, ev.clientY])
      }}
    >
    <DialogTitle id="simple-dialog-title" style={{fontSize: isSmartphone() ? '2.5em' : '1em'}}>
      {title}</DialogTitle>
    <DialogContent>{page}</DialogContent>
  </Dialog>
}

ShareDialog.displayName = 'ShareDialog'
