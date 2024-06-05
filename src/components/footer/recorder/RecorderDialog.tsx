import {acceleratorText2El, dialogStyle, titleStyle} from '@components/utils'
import Dialog from '@material-ui/core/Dialog'
import DialogContent from '@material-ui/core/DialogContent'
import DialogTitle from '@material-ui/core/DialogTitle'
import {useTranslation} from '@models/locales'
import sharedContents from '@stores/sharedContents/SharedContents'
import React from 'react'
import {RecorderMenu} from './RecorderMenu'
import {map} from '@stores/'
import { RecordInfo } from './RecordInfo'

export type RecorderStepType = 'menu' | 'infoFromMenu' | 'infoFromButton' | 'none'
export type SetRecorderStepType = (step: RecorderStepType) => void
export interface DialogPageProps {
  setRecorderStep: SetRecorderStepType
  recorderStep: RecorderStepType
}

export const RecorderDialog: React.FC<DialogPageProps> = (props:DialogPageProps) => {
  function getPage(step: RecorderStepType): JSX.Element | undefined {
    if (step === 'menu'){
      return <RecorderMenu {...props} setRecorderStep={props.setRecorderStep}  />
    }else if(step === 'infoFromButton' || step === 'infoFromMenu'){
      return <RecordInfo setRecorderStep={props.setRecorderStep} recorderStep={step}/>
    }else{
      throw new Error(`Unknown step: ${step}`)
    }
  }

  //  console.debug(`step=${step}, pasteEnabled=${sharedContents.pasteEnabled}`)
  sharedContents.pasteEnabled = props.recorderStep === 'none' || props.recorderStep === 'menu'

  const {t} = useTranslation()
  const stepTitle: {
    [key: string]: string | JSX.Element,
  } = {
    menu: acceleratorText2El(t('recorderMenuTitle')),
  }
  const title = stepTitle[props.recorderStep]
  const page: JSX.Element | undefined = getPage(props.recorderStep)

  return  <Dialog style={dialogStyle}
    open={props.recorderStep !== 'none'} onClose={()=>{props.setRecorderStep('none')}}
    TransitionProps={{onExited:() => props.setRecorderStep('menu')}} maxWidth="lg"
    onPointerMove = {(ev) => {
      map.setMouse([ev.clientX, ev.clientY])
    }}
  >
    <DialogTitle id="simple-dialog-title">
      <span style={titleStyle}>{title}</span></DialogTitle>
    <DialogContent>{page}</DialogContent>
  </Dialog>
}

RecorderDialog.displayName = 'RecorderDialog'
