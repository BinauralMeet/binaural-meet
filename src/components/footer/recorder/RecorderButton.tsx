import {acceleratorText2El} from '@components/utils/formatter'
import {makeStyles} from '@material-ui/styles'
import {useTranslation} from '@models/locales'
import React, { useEffect, useRef, useState } from 'react'
import {FabWithTooltip} from '@components/utils/FabEx'
import {RecorderDialog} from './RecorderDialog'
import PlayIcon from '@material-ui/icons/PlayArrow'
import StopIcon from '@material-ui/icons/Stop'
import PauseIcon from '@material-ui/icons/Pause'
import RecordIcon from '@material-ui/icons/FiberManualRecord'
import { player, recorder } from '@models/conference/Recorder'
import { Observer } from 'mobx-react-lite'
import { Button, Slider, TextField } from '@material-ui/core'
import _, { isNumber } from 'lodash'
import { autorun } from 'mobx'

const useStyles = makeStyles({
  root: {
    display: 'inline-block',
  },
})
interface RecorderButtonProps {
  showDialog:boolean
  setShowDialog(flag: boolean):void
  size?: number
  iconSize?: number
}
export const RecorderButton: React.FC<RecorderButtonProps> = (props) => {
  const classes = useStyles()
  const {t} = useTranslation()
  const iconSize = props.iconSize ? props.iconSize : 36
  const duration = player.duration
  const [seekOffset, setSeekOffset] = useState(player.offset)
  const [seekOffsetText, setSeekOffsetText] = useState(offsetNumberToText(player.offset))
  const doSeek = _.throttle((offset)=>{player.seek(offset)}, 500)
  const refPauseBySeek = useRef<boolean>(false)

  function offsetNumberToText(offset: number){
    const decimal = (offset % 1000).toString().padEnd(2, '0').slice(0, 2)
    offset = Math.floor(offset / 1000)
    const sec = (offset % 60).toString().padStart(2, '0')
    offset = Math.floor(offset / 60)
    const min = (offset % 60).toString().padStart(2, '0')
    offset = Math.floor(offset / 60)
    const hour = offset

    return `${hour? `${hour}:` : ''}${min}:${sec}.${decimal}`
  }
  function offsetTextToNumber(text: string){
    const timeA = text.split(':')
    let time = 0
    while(timeA.length){
      time *= 60
      const top = timeA.shift()
      if (timeA.length > 0){
        time += Number(top)
      }else{
        const lastA = top!.split('.')
        time += Number(lastA[0])
        if (lastA.length >= 2){
          let decimal = Number(lastA[1])
          const nDigits = Math.pow(10, decimal.toString().length)
          decimal /= nDigits
          time += decimal
        }
      }
    }
    return Math.floor(time * 1000)
  }

  function setSeekOffsetAndText(offset: number){
    setSeekOffset(offset)
    setSeekOffsetText(offsetNumberToText(offset))
  }
  useEffect(()=>{
    const disposer = autorun(()=>{
      if (player.state === 'play'){
        setSeekOffsetAndText(player.offset)
      }
    })
    return ()=>{disposer()}
  }, [])

  return (
    <div className={classes.root}>
      <Observer>{()=> <>
        {player.state === 'play' || player.state === 'pause' ?
          <div>
            <Button variant="contained" size="large" color="default" disableRipple={true}
              style={{pointerEvents: 'auto'}}>
              <div style={{display:'grid'}}>
                <TextField value={seekOffsetText} size="small" style={{width:'5em'}}
                                  onChange={(ev)=> {
                    setSeekOffsetText(ev.target.value)
                  }}
                  onKeyDown={(ev)=> {
                    if (ev.key === 'Enter'){
                      const offset = offsetTextToNumber(seekOffsetText)
                      setSeekOffsetAndText(offset)
                      //console.log('Text::onChange', seekOffset)
                      doSeek(offset)
                    }
                  }}
                />
                <Slider aria-label="seekbar" value={seekOffset} valueLabelDisplay="off"
                  style={{width:'10em'}} min={0} max={duration} track={"normal"}
                  onChange={(ev, val)=>{
                    if (isNumber(val)){
                      if (player.state === 'play'){
                        player.pause()
                        refPauseBySeek.current = true
                      }
                      if (player.state === 'pause'){
                        setSeekOffsetAndText(val)
                        doSeek(val)
                      }
                    }
                  }}
                  onChangeCommitted={()=>{
                    if (refPauseBySeek.current){
                      refPauseBySeek.current = false
                      player.play()
                    }
                  }}
                />
              </div>
            </Button>
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
        {player.state === 'play' || player.state === 'pause' || recorder.recording ?
          <FabWithTooltip size={props.size}
            title = {acceleratorText2El(t('ttStop'))}
            aria-label="share" onClick={() => {
              if (recorder.recording) recorder.stop()
              if (player.state !== 'stop') player.stop()
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
