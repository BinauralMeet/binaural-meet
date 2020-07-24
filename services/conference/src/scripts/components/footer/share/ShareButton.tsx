import {useStore as useContentsStore} from '@hooks/SharedContentsStore'
import Fab from '@material-ui/core/Fab'
import ShareIcon from '@material-ui/icons/Share'
import {makeStyles} from '@material-ui/styles'
import {useObserver} from 'mobx-react-lite'
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
  const store = useContentsStore()
  const sharing = useObserver(() => store.localMainTracks.size + store.localContentTracks.size)

  return (
    <div className={[props.className, classes.root].join(' ')}>
      <Fab size = "small" color={sharing ? 'secondary' : 'primary'}
        aria-label="share" onClick={() => setOpenDialog(true)}>
        <ShareIcon />
      </Fab>
      <ShareDialog open={openDialog} onClose={() => setOpenDialog(false)} />
    </div>
  )
}

ShareButton.displayName = 'ShareButton'
