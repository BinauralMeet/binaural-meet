import {Dialog, DialogTitle, List, ListItem, ListItemAvatar, ListItemText} from '@material-ui/core'
import {ScreenShare} from '@material-ui/icons'
import React from 'react'

interface ShareDialogProps {
  open: boolean
}

export const ShareDialog: React.FC<ShareDialogProps> = (props) => {
  const {
    open,
  } = props

  return  <Dialog open={open} >
    <DialogTitle id="simple-dialog-title">Share</DialogTitle>
    <List>
      <ListItem key="shareScreen">
        <ListItemAvatar>
          <ScreenShare />
        </ListItemAvatar>
        <ListItemText>
          Share Screen
        </ListItemText>
      </ListItem>
    </List>
  </Dialog>
}
