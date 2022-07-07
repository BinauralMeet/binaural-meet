import {acceleratorText2El, BMProps} from '@components/utils'
import Dialog from '@material-ui/core/Dialog'
import DialogContent from '@material-ui/core/DialogContent'
import DialogTitle from '@material-ui/core/DialogTitle'
import {useTranslation} from '@models/locales'
import {isSmartphone} from '@models/utils'
import sharedContents from '@stores/sharedContents/SharedContents'
import React, {useState} from 'react'
import {RecorderMenu} from './RecorderMenu'
import {Step} from './Step'

interface RecorderDialogProps extends BMProps{
  open: boolean
  onClose: () => void
}

export const RecorderDialog: React.FC<RecorderDialogProps> = (props:RecorderDialogProps) => {
  const {open, onClose} = props
  const {map} = props.stores
  const [step, rawSetStep] = useState<Step>('menu')

  const setStep = (step: Step) => {
    if (step === 'none') {
      onClose()
    } else {
      rawSetStep(step)
    }
  }
  function getPage(step: Step, setStep: (step: Step) => void): JSX.Element | undefined {
    switch (step) {
      case 'menu':
        return <RecorderMenu {...props} setStep={setStep}  />
      default:
        throw new Error(`Unknown step: ${step}`)
    }
  }

  //  console.debug(`step=${step}, pasteEnabled=${sharedContents.pasteEnabled}`)
  sharedContents.pasteEnabled = step === 'none' || step === 'menu'

  const {t} = useTranslation()
  const stepTitle: {
    [key: string]: string | JSX.Element,
  } = {
    menu: acceleratorText2El(t('recorderMenuTitle')),
  }
  const title = stepTitle[step]
  const page: JSX.Element | undefined = getPage(step, setStep)

  return  <Dialog open={open} onClose={onClose} TransitionProps={{onExited:() => setStep('menu')}} maxWidth="lg"
      onPointerMove = {(ev) => {
        map.setMouse([ev.clientX, ev.clientY])
      }}
    >
    <DialogTitle id="simple-dialog-title" style={{fontSize: isSmartphone() ? '2.5em' : '1em'}}>
      {title}</DialogTitle>
    <DialogContent>{page}</DialogContent>
  </Dialog>
}

RecorderDialog.displayName = 'RecorderDialog'
