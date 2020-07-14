import Dialog from '@material-ui/core/Dialog'
import DialogTitle from '@material-ui/core/DialogTitle'
import List from '@material-ui/core/List'
import ScreenShare from '@material-ui/icons/ScreenShare'
import {shareScreenStream} from '@models/share/shareScreenStream'
import React from 'react'
import {ShareDialogItem} from './SharedDialogItem'


interface ShareDialogProps {
  open: boolean
  onClose: () => void
}

export const ShareDialog: React.FC<ShareDialogProps> = (props) => {
  const {
    open,
    onClose,
  } = props

  return  <Dialog open={open} onClose={onClose} >
    <DialogTitle id="simple-dialog-title">Share</DialogTitle>
    <List>
      <ShareDialogItem
        key="shareScreen"
        icon={<ScreenShare />}
        text="Share Screen"
        onClick={() => {
          startCapture().then(shareScreenStream)
          onClose()
        }}
      />
    </List>
  </Dialog>
}

async function startCapture(displayMediaOptions: any = {}) {
  let captureStream = null

  try {
    // @ts-ignore FIXME: https://github.com/microsoft/TypeScript/issues/33232
    captureStream = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions)
  } catch (err) {
    console.error(`Share screen error: ${err}`)
    throw err
  }

  return captureStream as MediaStream
}
