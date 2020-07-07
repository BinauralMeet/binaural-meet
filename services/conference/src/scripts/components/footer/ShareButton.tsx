import Fab from '@material-ui/core/Fab'
import ShareIcon from '@material-ui/icons/Share'
import {makeStyles} from '@material-ui/styles'
import React, {useState} from 'react'
import {ShareDialog} from './ShareDialog'

const useStyles = makeStyles({
  root: {
    display: 'inline-block',
  },
})

interface ShareButtonProps {
  className: string
}

export const ShareButton: React.FC<ShareButtonProps> = (props) => {
  const [openDialog, setOpenDialog] = useState<boolean>(false)
  const classes = useStyles()

  return (
    <div className={[props.className, classes.root].join(' ')}>
      <Fab size = "small" color={false ? 'secondary' : 'primary'}
        aria-label="share" onClick={() => setOpenDialog(true)}>
        <ShareIcon />
      </Fab>
      <ShareDialog open={openDialog} onClose={() => setOpenDialog(false)} />
    </div>
  )
}

ShareButton.displayName = 'ShareButton'
