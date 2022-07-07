import {BMProps} from '@components/utils'
import {acceleratorText2El} from '@components/utils/formatter'
import {makeStyles} from '@material-ui/styles'
import {useTranslation} from '@models/locales'
import React from 'react'
import {FabWithTooltip} from '@components/utils/FabEx'
import {RecorderDialog} from './RecorderDialog'
import PlayIcon from '@material-ui/icons/PlayArrow'
import StopIcon from '@material-ui/icons/Stop'
import RecordIcon from '@material-ui/icons/FiberManualRecord'
import { player, recorder } from '@models/conference/Recorder'
import { Observer } from 'mobx-react-lite'


const useStyles = makeStyles({
  root: {
    display: 'inline-block',
  },
})
interface RecorderButtonProps extends BMProps{
  showDialog:boolean
  setShowDialog(flag: boolean):void
  size?: number
  iconSize?: number
}
export const RecorderButton: React.FC<RecorderButtonProps> = (props) => {
  const classes = useStyles()
  const {t} = useTranslation()
  const iconSize = props.iconSize ? props.iconSize : 36

  return (
    <div className={classes.root}>
      <Observer>{()=>
        <FabWithTooltip size={props.size} color={recorder.recording ? 'secondary' : 'primary'}
          title = {acceleratorText2El(t('ttPlayAndRec'))}
          aria-label="share" onClick={() => {
            if (recorder.recording) recorder.stop()
            if (player.playing) player.stop()
            props.setShowDialog(true)
          }}>
          {
            player.playing ? <StopIcon style={{width:iconSize, height:iconSize}} />
            : recorder.recording ? <RecordIcon style={{width:iconSize, height:iconSize}}/>
            : <PlayIcon style={{width:iconSize, height:iconSize}} />
          }
        </FabWithTooltip>
      }</Observer>
      {props.showDialog ?
        <RecorderDialog {...props} open={props.showDialog} onClose={() => props.setShowDialog(false)} />
        : undefined}
    </div>
  )
}

RecorderButton.displayName = 'RecorderButton'
