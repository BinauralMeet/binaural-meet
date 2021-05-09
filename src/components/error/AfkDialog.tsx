import Button from '@material-ui/core/Button'
import DialogContent from '@material-ui/core/DialogContent'
import {t} from '@models/locales'
import {isSmartphone} from '@models/utils'
import errorInfo from '@stores/ErrorInfo'
import participants from '@stores/participants/Participants'
import React from 'react'
import {ErrorDialogFrame} from './ErrorDialog'

export const AfkDialog: React.FC<{}> = () => {
  const onClose = () => {
    participants.local.awayFromKeyboard = false
    errorInfo.clear()
  }

  return <ErrorDialogFrame onClose={onClose}>
    <DialogContent style={{fontSize: isSmartphone() ? '2em' : '1em'}}>
      <Button color="primary" variant="contained" style={{textTransform:'none'}} autoFocus={true}
        onKeyDown={onClose} onClick={onClose}>
        {t('afkMessage')}
      </Button>
      </DialogContent>
  </ErrorDialogFrame>
}
AfkDialog.displayName = 'AfkDialog'
