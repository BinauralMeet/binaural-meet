import Dialog from '@material-ui/core/Dialog'
import DialogContent from '@material-ui/core/DialogContent'
import DialogTitle from '@material-ui/core/DialogTitle'
import errorInfo, {ErrorType} from '@stores/ErrorInfo'
import {useObserver} from 'mobx-react-lite'
import React from 'react'

const pages = new Map<ErrorType, JSX.Element>()
export const ErrorDialog: React.FC<{}> = (props) => {
  const title = useObserver(() => errorInfo.title)
  const message = useObserver(() => errorInfo.message)
  const open = useObserver(() => errorInfo.type !== '')
  let page = <DialogContent> {message} </DialogContent>
  if (pages.has(errorInfo.type)) {
    page = pages.get(errorInfo.type)!
  }

  return <Dialog open={open} onClose={ () => { errorInfo.type = '' } }
    maxWidth="sm" fullWidth={true} >
    <DialogTitle id="simple-dialog-title">{title}</DialogTitle>
    {page}
  </Dialog>
}

ErrorDialog.displayName = 'ErrorDialog'
