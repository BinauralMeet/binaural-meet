import {BMProps} from '@components/utils'
import {acceleratorText2El} from '@components/utils/formatter'
import windowArrowUp from '@iconify/icons-fluent/window-arrow-up-24-regular'

import {Icon} from '@iconify/react'
import {makeStyles} from '@material-ui/styles'
import { conference } from '@models/conference'
import {useTranslation} from '@models/locales'
import {useObserver} from 'mobx-react-lite'
import React from 'react'
import {FabWithTooltip} from '@components/utils/FabEx'
import {ShareDialog} from './ShareDialog'


const useStyles = makeStyles({
  root: {
    display: 'inline-block',
  },
})
interface ShareButtonProps extends BMProps{
  showDialog:boolean
  setShowDialog(flag: boolean):void
  size?: number
  iconSize?: number
}
export const ShareButton: React.FC<ShareButtonProps> = (props) => {
  const classes = useStyles()
  const contents = props.stores.contents
  const sharing = useObserver(() => contents.getLocalRtcContentIds().length || contents.mainScreenOwner === conference.rtcTransports.peer)
  const {t} = useTranslation()

  return (
    <div className={classes.root}>
      <FabWithTooltip size={props.size} color={sharing ? 'secondary' : 'primary'}
        title = {acceleratorText2El(t('ttCreateAndshare'))}
        aria-label="share" onClick={() => props.setShowDialog(true)}>
        <Icon icon={windowArrowUp} style={{width:props.iconSize, height:props.iconSize}} />
      </FabWithTooltip>
      {props.showDialog ?
        <ShareDialog {...props} open={props.showDialog} onClose={() => props.setShowDialog(false)} />
        : undefined}
    </div>
  )
}

ShareButton.displayName = 'ShareButton'
