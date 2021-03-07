import {useStore as useMapStore} from '@hooks/MapStore'
import Dialog from '@material-ui/core/Dialog'
import DialogContent from '@material-ui/core/DialogContent'
import DialogTitle from '@material-ui/core/DialogTitle'
import {useTranslation} from '@models/locales'
import {isSmartphone} from '@models/utils'
import {createContentOfIframe, createContentOfText} from '@stores/sharedContents/SharedContentCreator'
import sharedContents from '@stores/sharedContents/SharedContents'
import React, {useState} from 'react'
import {CameraSelector} from './CameraSelector'
import {Entrance} from './Entrance'
import {ImageInput} from './ImageInput'
import {Step} from './Step'
import {TextInput} from './TextInput'

interface ShareDialogProps {
  open: boolean
  onClose: () => void
}

export const ShareDialog: React.FC<ShareDialogProps> = (props) => {
  const {
    open,
    onClose,
  } = props

  const map = useMapStore()
  const [step, setStep] = useState<Step>('entrance')

  const wrappedSetStep = (step: Step) => {
    if (step === 'none') {
      onClose()
    } else {
      setStep(step)
    }
  }
  function getPage(step: Step, setStep: (step: Step) => void): JSX.Element | undefined {
    switch (step) {
      case 'entrance':
        return <Entrance setStep={setStep} />
      case 'text':
        return <TextInput
            setStep={setStep}
            onFinishInput={(value) => {
              sharedContents.shareContent(createContentOfText(value, map))
              //  console.debug(`share text: ${value}`)
            }}
            textLabel = "Text"
          />
      case 'iframe':
        return <TextInput
            setStep={setStep}
            onFinishInput={(value) => {
              sharedContents.shareContent(createContentOfIframe(value, map))
            }}
            textLabel = "URL"
          />
      case 'image':
        return <ImageInput setStep={setStep} />
      case 'camera':
        return <CameraSelector setStep={setStep} />
      default:
        throw new Error(`Unknown step: ${step}`)
    }
  }

  //  console.debug(`step=${step}, pasteEnabled=${sharedContents.pasteEnabled}`)
  sharedContents.pasteEnabled = step === 'none' || step === 'entrance'

  const {t} = useTranslation()
  const stepTitle: {
    [key: string]: string,
  } = {
    entrance: t('Create and Share'),
    text: t('Share Text'),
    iframe: t('Share iframe'),
    image: t('Share image'),
    none: 'None',
    camera: t('Select video camera to share'),
  }
  const title = stepTitle[step]
  const page: JSX.Element | undefined = getPage(step, wrappedSetStep)

  return  <Dialog open={open} onClose={onClose} onExited={() => setStep('entrance')} maxWidth="sm" fullWidth={true}
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
