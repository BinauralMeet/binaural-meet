import Dialog from '@material-ui/core/Dialog'
import DialogContent from '@material-ui/core/DialogContent'
import DialogTitle from '@material-ui/core/DialogTitle'
import errorInfo, {ErrorType} from '@stores/ErrorInfo'
import {Observer} from 'mobx-react-lite'
import React from 'react'
import {TheEntrance} from './TheEntrance'

export const pages = new Map<ErrorType, JSX.Element>()
pages.set('enterance', <TheEntrance />)

export const ErrorDialog: React.FC<{}> = (props) => {
//  const title =
//  const message = useLocalObservable(() => errorInfo.message)
//  const open = useLocalObservable(() => errorInfo.type !== '')
  let page = <DialogContent>
    <Observer>{()=><> {errorInfo.message} </>}</Observer>
  </DialogContent>
  if (pages.has(errorInfo.type)) {
    page = <Observer>{() => <> {pages.get(errorInfo.type)!} </>}</Observer>
  }

  return <Observer>{
    () => <Dialog open={errorInfo.type !== ''} onClose={ () => { errorInfo.clear() }}
      maxWidth="md" fullWidth={false} >
      {errorInfo.title ? <DialogTitle id="simple-dialog-title">{errorInfo.title}</DialogTitle> : undefined }
      {page}
    </Dialog>
  }</Observer>
}
ErrorDialog.displayName = 'ErrorDialog'
