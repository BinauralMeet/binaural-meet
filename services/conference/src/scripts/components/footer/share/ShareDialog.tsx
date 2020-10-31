import {useStore as useMapStore} from '@hooks/MapStore'
import Dialog from '@material-ui/core/Dialog'
import DialogContent from '@material-ui/core/DialogContent'
import DialogTitle from '@material-ui/core/DialogTitle'
import {createContentOfIframe, createContentOfText} from '@stores/sharedContents/SharedContentCreator'
import sharedContents from '@stores/sharedContents/SharedContents'
import React, {useState} from 'react'
import {Entrance} from './Entrance'
import {ImageInput} from './ImageInput'
import {Step, stepTitle} from './Step'
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
              console.debug(`share text: ${value}`)
            }}
            textLabel = "Text"
          />
      case 'iframe':
        return <TextInput
            setStep={setStep}
            onFinishInput={(value) => {
              sharedContents.shareContent(createContentOfIframe(value, map))
              console.debug(`share iframe: ${value}`)
            }}
            textLabel = "URL"
          />
      case 'image':
        return <ImageInput setStep={setStep} />
      default:
        throw new Error(`Unknown step: ${step}`)
    }
  }

  console.debug(`step=${step}, pasteEnabled=${sharedContents.pasteEnabled}`)
  sharedContents.pasteEnabled = step === 'none' || step === 'entrance'

  const title = stepTitle[step]
  const page: JSX.Element | undefined = getPage(step, wrappedSetStep)

  return  <Dialog open={open} onClose={onClose} onExited={() => setStep('entrance')} maxWidth="sm" fullWidth={true}
      onMouseMove = {(ev) => {
        map.setMouse([ev.clientX, ev.clientY])
      }}
    >
    <DialogTitle id="simple-dialog-title">{title}</DialogTitle>
    <DialogContent>{page}</DialogContent>
  </Dialog>
}

ShareDialog.displayName = 'ShareDialog'
