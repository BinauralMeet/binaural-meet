import Dialog from '@material-ui/core/Dialog'
import DialogContent from '@material-ui/core/DialogContent'
import DialogTitle from '@material-ui/core/DialogTitle'
import errorInfo, {ErrorType} from '@stores/ErrorInfo'
import {Observer} from 'mobx-react-lite'
import React from 'react'
import {AfkDialog} from './AfkDialog'
import {TheEntrance} from './TheEntrance'

export const dialogs = new Map<ErrorType, JSX.Element>()
dialogs.set('enterance', <TheEntrance />)
dialogs.set('afk', <AfkDialog />)

export const ErrorDialogFrame: React.FC<{onClose:(event:{}, reason:string)=>void}> = (props) => {
  return <Dialog {...props} open={errorInfo.type !== ''} onClose={props.onClose}
  maxWidth="md" fullWidth={false} >
  {errorInfo.title ?
    <DialogTitle id="simple-dialog-title">{errorInfo.title}</DialogTitle>
    : undefined }
  {props.children}
</Dialog>
}


export const ErrorDialog: React.FC<{}> = (props) => {
  return <Observer>{
    () => {
      if (errorInfo.type){
        if (dialogs.has(errorInfo.type)) {
          return dialogs.get(errorInfo.type)!
        }else{
          return <ErrorDialogFrame onClose={()=>{errorInfo.clear()} }>
            <DialogContent>{errorInfo.message}</DialogContent>
            </ErrorDialogFrame>
        }
      }

      return <></>
    }
  }</Observer>
}
ErrorDialog.displayName = 'ErrorDialog'
