import Dialog from '@material-ui/core/Dialog'
import DialogTitle from '@material-ui/core/DialogTitle'
import React, {useEffect, useState} from 'react'
import {Entrance} from './Entrance'
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

  const [step, setStep] = useState<Step>('entrance')

  const wrappedSetStep = (step: Step) => {
    if (step === 'none') {
      onClose()
    } else {
      setStep(step)
    }
  }

  const title = stepTitle[step]
  const page: JSX.Element | undefined = getPage(step, wrappedSetStep)

  return  <Dialog open={open} onClose={onClose} onExited={() => setStep('entrance')}>
    <DialogTitle id="simple-dialog-title">{title}</DialogTitle>
    {page}
  </Dialog>
}

function getPage(step: Step, setStep: (step: Step) => void): JSX.Element | undefined {
  switch (step) {
    case 'entrance':
      return <Entrance setStep={setStep} />
    case 'text':
      return <TextInput
          setStep={setStep}
          onFinishInput={(value) => {
            // TODO modify store
            console.debug(`share text: ${value}`)
          }}
          textLabel = "Text"
        />
    case 'iframe':
      return <TextInput
          setStep={setStep}
          onFinishInput={(value) => {
            // TODO modify store
            console.debug(`share iframe: ${value}`)
          }}
          textLabel = "URL"
        />
    case 'image':
      // TODO
      return <div>todo: drag and drop interface</div>
    default:
      throw new Error(`Unknown step: ${step}`)
  }
}
