import {useStore as useMapStore} from '@hooks/MapStore'
import Dialog from '@material-ui/core/Dialog'
import DialogContent from '@material-ui/core/DialogContent'
import DialogTitle from '@material-ui/core/DialogTitle'
import errorInfo from '@stores/ErrorInfo'
import {useObserver} from 'mobx-react-lite'
import React from 'react'

export const ErrorDialog: React.FC<{}> = (props) => {
  const map = useMapStore()
  const title = useObserver(() => errorInfo.title)
  const message = useObserver(() => errorInfo.message)
  const open = useObserver(() => errorInfo.type !== '')

  return  <Dialog open={open} onClose={ () => { errorInfo.type = '' } }
    maxWidth="sm" fullWidth={true} >
    <DialogTitle id="simple-dialog-title">{title}</DialogTitle>
    <DialogContent>
    {message}
    </DialogContent>
  </Dialog>
}

ErrorDialog.displayName = 'ErrorDialog'
