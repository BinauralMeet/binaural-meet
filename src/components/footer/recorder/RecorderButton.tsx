import {BMProps} from '@components/utils'
import {acceleratorText2El} from '@components/utils/formatter'
import {makeStyles} from '@material-ui/styles'
import {useTranslation} from '@models/locales'
import React, { useEffect, useState } from 'react'
import {FabMain, FabWithTooltip} from '@components/utils/FabEx'
import {RecorderDialog} from './RecorderDialog'
import PlayIcon from '@material-ui/icons/PlayArrow'
import StopIcon from '@material-ui/icons/Stop'
import PauseIcon from '@material-ui/icons/Pause'
import RecordIcon from '@material-ui/icons/FiberManualRecord'
import { player, recorder } from '@models/conference/Recorder'
import { Observer } from 'mobx-react-lite'
import { Fab, Slider } from '@material-ui/core'
import _, { isNumber } from 'lodash'
import { autorun } from 'mobx'


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
  const duration = player.endTime - player.startTime
  const [seekOffset, setSeekOffset] = useState(player.currentTime - player.startTime)
  const doSeek = _.throttle(()=>{player.seek(seekOffset)}, 500)
  useEffect(()=>{
    const disposer = autorun(()=>{
      if (player.state === 'play'){
        setSeekOffset(player.currentTime - player.startTime)
      }
    })
    return ()=>{disposer()}
  }, [])

  return (
    <div className={classes.root}>
      <Observer>{()=> <>
        {player.state === 'play' || player.state === 'pause' ?
          <div>
          <Fab variant="extended" size="small" color="default" disabled={false}
            style={{pointerEvents: 'auto'}}>
          <Slider aria-label="seekbar" value={seekOffset} valueLabelDisplay="off"
            style={{width:iconSize*4}} min={0} max={duration} track={"normal"}
            onChange={(ev, val)=>{
              if (player.state === 'pause' && isNumber(val)){
                setSeekOffset(val)
                doSeek()
              }
            }
          } />
          </Fab>
          </div>
        : undefined}
        {!recorder.recording && player.state === 'stop' ?
          <FabWithTooltip size={props.size} color={recorder.recording ? 'secondary' : 'primary'}
            title = {acceleratorText2El(t('ttPlayAndRec'))}
            aria-label="share" onClick={() => {
              props.setShowDialog(true)
            }}>
            {recorder.recording ? <RecordIcon style={{width:iconSize, height:iconSize}} />
              : <PlayIcon style={{width:iconSize, height:iconSize}} />
            }
          </FabWithTooltip> : undefined}
        {!recorder.recording && (player.state === 'play' || player.state === 'pause') ?
          <FabWithTooltip size={props.size}
            title = {acceleratorText2El(t('ttStop'))}
            aria-label="share" onClick={() => {
              player.stop()
            }}>
            <StopIcon color='primary' style={{width:iconSize, height:iconSize}} />
          </FabWithTooltip> : undefined}
        {!recorder.recording && player.state === 'play' ?
          <FabWithTooltip size={props.size}
            title = {acceleratorText2El(t('ttPause'))}
            aria-label="share" onClick={() => {
              player.pause()
            }}>
            <PauseIcon color='primary' style={{width:iconSize, height:iconSize}} />
          </FabWithTooltip> : undefined}
        {!recorder.recording && player.state === 'pause' ?
          <FabWithTooltip size={props.size}
            title = {acceleratorText2El(t('ttPlay'))}
            aria-label="share" onClick={() => {
              player.play()
            }}>
            <PlayIcon style={{width:iconSize, height:iconSize}} />
          </FabWithTooltip> : undefined}
        </>
      }</Observer>
      {props.showDialog ?
        <RecorderDialog {...props} open={props.showDialog} onClose={() => props.setShowDialog(false)} />
        : undefined}
    </div>
  )
}

RecorderButton.displayName = 'RecorderButton'
