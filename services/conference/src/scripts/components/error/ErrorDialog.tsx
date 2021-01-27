import {useStore as useMap} from '@hooks/MapStore'
import Dialog from '@material-ui/core/Dialog'
import DialogContent from '@material-ui/core/DialogContent'
import DialogTitle from '@material-ui/core/DialogTitle'
import errorInfo, {ErrorType} from '@stores/ErrorInfo'
import {useObserver} from 'mobx-react-lite'
import React from 'react'
import {TheEntrance} from './TheEntrance'

export const pages = new Map<ErrorType, JSX.Element>()
pages.set('enterance', <TheEntrance />)

export const ErrorDialog: React.FC<{}> = (props) => {
  const map = useMap()
  const title = useObserver(() => errorInfo.title)
  const message = useObserver(() => errorInfo.message)
  const open = useObserver(() => errorInfo.type !== '')
  let page = <DialogContent> {message} </DialogContent>
  if (pages.has(errorInfo.type)) {
    page = pages.get(errorInfo.type)!
  }
  if (open) { map.keyInputUsers.add(ErrorDialog.displayName!) }

  return <Dialog open={open} onClose={ () => {
    map.keyInputUsers.delete(ErrorDialog.displayName!)
    errorInfo.type = ''
  }}
    maxWidth="sm" fullWidth={true} >
    <DialogTitle id="simple-dialog-title">{title}</DialogTitle>
    {page}
  </Dialog>
}
ErrorDialog.displayName = 'ErrorDialog'
