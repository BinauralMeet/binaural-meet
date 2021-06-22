import Box from '@material-ui/core/Box'
import Button from '@material-ui/core/Button'
import Dialog from '@material-ui/core/Dialog'
import DialogContent from '@material-ui/core/DialogContent'
import DialogTitle from '@material-ui/core/DialogTitle'
import {t} from '@models/locales'
import errorInfo, {ErrorType} from '@stores/ErrorInfo'
import {Observer} from 'mobx-react-lite'
import React from 'react'
import {AfkDialog} from './AfkDialog'
import {TheEntrance} from './TheEntrance'


export const dialogs = new Map<ErrorType, JSX.Element>()
dialogs.set('entrance', <TheEntrance />)
dialogs.set('afk', <AfkDialog />)

export const ErrorDialogFrame: React.FC<{onClose:(event:{}, reason:string)=>void}> = (props) => {
  return <Dialog {...props} open={errorInfo.show()}
    onClose={props.onClose} maxWidth="md" fullWidth={false} >
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
            <Box mt={2} mb={2} ml={4}>
            <Button variant="contained" color="primary" style={{textTransform:'none'}}
              onClick={() => {errorInfo.clear()}} >
              {t('emClose')}
            </Button>&nbsp;
            <Button variant="contained" color="secondary" style={{textTransform:'none'}}
              onClick={() => {
                errorInfo.supressedTypes.add(errorInfo.type)
                errorInfo.clear()
              }}>
              {t('emNeverShow')}
            </Button>
            </Box>
          </ErrorDialogFrame>
        }
      }

      return <></>
    }
  }</Observer>
}
ErrorDialog.displayName = 'ErrorDialog'
