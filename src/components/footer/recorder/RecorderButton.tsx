import {acceleratorText2El} from '@components/utils/formatter'
import {makeStyles} from '@material-ui/styles'
import {useTranslation} from '@models/locales'
import {timeToHourMinSecDec} from '@models/utils/date'
import {SEEK_THROTTLE_MS} from '@models/recorder/RecorderTypes'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import {FabWithTooltip} from '@components/utils/FabEx'
import {RecorderDialog, RecorderStepType, SetRecorderStepType} from './RecorderDialog'
import PlayIcon from '@material-ui/icons/PlayArrow'
import StopIcon from '@material-ui/icons/Stop'
import PauseIcon from '@material-ui/icons/Pause'
import RecordIcon from '@material-ui/icons/FiberManualRecord'
import InfoIcon from '@material-ui/icons/InfoRounded'
import { player, recorder,  } from '@models/recorder'
import { Observer } from 'mobx-react-lite'
import { Button, IconButton, MenuItem, Paper, Select, Slider, TextField } from '@material-ui/core'
import _, { isNumber } from 'lodash'
import { autorun } from 'mobx'

const useStyles = makeStyles({
  root: {
    display: 'inline-block',
  },
})
interface RecorderButtonProps {
  recorderStep:RecorderStepType
  setRecorderStep:SetRecorderStepType
  size?: number
  iconSize?: number
}
export const RecorderButton: React.FC<RecorderButtonProps> = (props) => {
  const classes = useStyles()
  const {t} = useTranslation()
  const iconSize = props.iconSize ? props.iconSize : 36
  const duration = player.duration
  const [seekOffset, setSeekOffset] = useState(player.offset)
  const [seekOffsetText, setSeekOffsetText] = useState(timeToHourMinSecDec(player.offset))
  const [rate, setRate] = useState(1.0)
  const doSeek = useMemo(() => _.throttle((offset:number)=>{player.seek(offset)}, SEEK_THROTTLE_MS), [])
  const refPauseBySeek = useRef<boolean>(false)

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
    setSeekOffsetText(timeToHourMinSecDec(offset))
  }
  useEffect(()=>{
    const disposer = autorun(()=>{
      setSeekOffsetAndText(player.offset)
    })
    return ()=>{disposer()}
  }, [])
  useEffect(()=>()=>{doSeek.cancel()}, [doSeek])

  return (
    <div className={classes.root}>
      <Observer>{()=> <>
        {player.state === 'play' || player.state === 'pause' ?
          <div>
            <Paper elevation={5}
              style={{pointerEvents: 'auto', padding:15, backgroundColor:'gainsboro'}}>
              <div style={{display:'grid'}}>
                <div style={{display:"inline-block"}}>
                <TextField value={seekOffsetText} size="small" style={{width:'5em'}}
                                  onChange={(ev)=> {
                    setSeekOffsetText(ev.target.value)
                  }}
                  onKeyDown={(ev)=> {
                    if (ev.key === 'Enter'){
                      const offset = offsetTextToNumber(seekOffsetText)
                      setSeekOffsetAndText(offset)
                      doSeek(offset)
                    }
                  }}
                />
                &nbsp;x
                <Select style={{height:28}} label="rate" value={rate} onChange={(ev)=>{
                  const r = Number(ev.target.value)
                  player.setRate(r)
                  setRate(r)
                }}>
                  <MenuItem value={0.5}>0.5</MenuItem>
                  <MenuItem value={1.0}>1.0</MenuItem>
                  <MenuItem value={1.5}>1.5</MenuItem>
                  <MenuItem value={2.0}>2.0</MenuItem>
                </Select>
                &nbsp;
                <IconButton color="primary" style={{height:iconSize*0.7, width:iconSize*0.7}}
                  onClick={()=>{ props.setRecorderStep('infoFromButton')}}>
                  <InfoIcon style={{height:iconSize*0.6, width:iconSize*0.6, margin:0}} />
                </IconButton>
              </div>
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
                  onChangeCommitted={(_ev, val)=>{
                    doSeek.cancel()
                    if (isNumber(val)){
                      setSeekOffsetAndText(val)
                      player.seek(val)
                    }
                    if (refPauseBySeek.current){
                      refPauseBySeek.current = false
                      player.play()
                    }
                  }}
                />
              </div>
            </Paper>
          </div>
        : undefined}
        {!recorder.recording && player.state === 'stop' ?
          <FabWithTooltip size={props.size} color={recorder.recording ? 'secondary' : 'primary'}
            title = {acceleratorText2El(t('ttPlayAndRec'))}
            aria-label="share" onClick={() => {
              props.setRecorderStep('menu')
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
        {!recorder.recording && (player.state === 'play' || refPauseBySeek.current) ?
          <FabWithTooltip size={props.size}
            title = {acceleratorText2El(t('ttPause'))}
            aria-label="share" onClick={() => {
              player.pause()
            }}>
            <PauseIcon color='primary' style={{width:iconSize, height:iconSize}} />
          </FabWithTooltip> : undefined}
        {!recorder.recording && (player.state === 'pause' && !refPauseBySeek.current) ?
          <FabWithTooltip size={props.size}
            title = {acceleratorText2El(t('ttPlay'))}
            aria-label="share" onClick={() => {
              player.play()
            }}>
            <PlayIcon style={{width:iconSize, height:iconSize}} />
          </FabWithTooltip> : undefined}
        </>
      }</Observer>
      {props.recorderStep !== 'none' ?
        <RecorderDialog {...props} />
        : undefined}
    </div>
  )
}

RecorderButton.displayName = 'RecorderButton'
