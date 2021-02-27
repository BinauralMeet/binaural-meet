import {useStore as useMapStore} from '@hooks/MapStore'
import {useStore as useContentsStore} from '@hooks/SharedContentsStore'
import ScreenShareIcon from '@material-ui/icons/ScreenShare'
import {makeStyles} from '@material-ui/styles'
import {useObserver} from 'mobx-react-lite'
import React, {useEffect, useState} from 'react'
import {FabMain, FabWithTooltip} from '../FabEx'
import {ShareDialog} from './ShareDialog'

const useStyles = makeStyles({
  root: {
    display: 'inline-block',
  },
})
interface ShareButtonProps{
  showDialog:boolean
  setShowDialog(flag: boolean):void
  size?: number
  iconSize?: number
}
export const ShareButton: React.FC<ShareButtonProps> = (props) => {
  const classes = useStyles()
  const store = useContentsStore()
  const sharing = useObserver(() => store.tracks.localMains.size + store.tracks.localContents.size)
  const map = useMapStore()

  return (
    <div className={classes.root}>
      <FabWithTooltip size={props.size} color={sharing ? 'secondary' : 'primary'}
        title = {<><strong>C</strong>reate and share</>}
        aria-label="share" onClick={() => props.setShowDialog(true)}>
        <ScreenShareIcon style={{width:props.iconSize, height:props.iconSize}} />
      </FabWithTooltip>
      <ShareDialog open={props.showDialog} onClose={() => props.setShowDialog(false)} />
    </div>
  )
}

ShareButton.displayName = 'ShareButton'
