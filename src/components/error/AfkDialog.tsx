import Button from '@material-ui/core/Button'
import DialogContent from '@material-ui/core/DialogContent'
import {t} from '@models/locales'
import {buttonStyle, dialogStyle} from '@components/utils'
import errorInfo from '@stores/ErrorInfo'
import map from '@stores/Map'
import React, { useEffect } from 'react'
import {ErrorDialogFrame} from './ErrorDialog'

export const AfkDialog: React.FC<{}> = () => {
  useEffect(()=>{
    map.keyInputUsers.add('AfkDialog')
  })
  const onClose = (ev:{}) => {
    map.keyInputUsers.delete('AfkDialog')
    const evKey = ev as React.KeyboardEvent
    if (evKey.code){
      //  console.log(`onClose code=${evKey.code}`)
      evKey.preventDefault()
      evKey.stopPropagation()
    }
    errorInfo.clear()
  }

  return <ErrorDialogFrame style={dialogStyle} onClose={onClose}>
    <DialogContent>
      <Button color="primary" variant="contained" style={buttonStyle} autoFocus={true}
        onKeyDown={onClose} onClick={onClose}>
        {t('afkMessage')}
      </Button>
      </DialogContent>
  </ErrorDialogFrame>
}
AfkDialog.displayName = 'AfkDialog'
