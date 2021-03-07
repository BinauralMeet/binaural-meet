import {acceleratorText2El} from '@components/utils/formatter'
import {useStore as useMapStore} from '@hooks/MapStore'
import {useStore as useContentsStore} from '@hooks/SharedContentsStore'
import shareSquare from '@iconify-icons/fa-solid/share-square'
import {Icon} from '@iconify/react'
import {makeStyles} from '@material-ui/styles'
import {useTranslation} from '@models/locales'
import {useObserver} from 'mobx-react-lite'
import React from 'react'
import {FabWithTooltip} from '../FabEx'
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
  const {t} = useTranslation()

  return (
    <div className={classes.root}>
      <FabWithTooltip size={props.size} color={sharing ? 'secondary' : 'primary'}
        title = {acceleratorText2El(t('ttCreateAndshare'))}
        aria-label="share" onClick={() => props.setShowDialog(true)}>
        <Icon icon={shareSquare} style={{width:props.iconSize, height:props.iconSize}} />
      </FabWithTooltip>
      <ShareDialog open={props.showDialog} onClose={() => props.setShowDialog(false)} />
    </div>
  )
}

ShareButton.displayName = 'ShareButton'
