import {useStore as useContentsStore} from '@hooks/SharedContentsStore'
import ShareIcon from '@material-ui/icons/Share'
import {makeStyles} from '@material-ui/styles'
import {useObserver} from 'mobx-react-lite'
import React, {useState} from 'react'
import {FabMain} from '../FabNoFocus'
import {ShareDialog} from './ShareDialog'

const useStyles = makeStyles({
  root: {
    display: 'inline-block',
  },
})

export const ShareButton: React.FC = () => {
  const [openDialog, setOpenDialog] = useState<boolean>(false)
  const classes = useStyles()
  const store = useContentsStore()
  const sharing = useObserver(() => store.tracks.localMains.size + store.tracks.localContents.size)

  return (
    <div className={classes.root}>
      <FabMain color={sharing ? 'secondary' : 'primary'}
        aria-label="share" onClick={() => setOpenDialog(true)}>
        <ShareIcon />
      </FabMain>
      <ShareDialog open={openDialog} onClose={() => setOpenDialog(false)} />
    </div>
  )
}

ShareButton.displayName = 'ShareButton'
