import {Stores} from '@components/utils'
import Button from '@material-ui/core/Button'
import FormControlLabel from '@material-ui/core/FormControlLabel'
import Grid from '@material-ui/core/Grid'
import Box from '@material-ui/core/Box'
import Slider from '@material-ui/core/Slider'
import {conference} from '@models/conference'
import {t} from '@models/locales'
import {useObserver} from 'mobx-react-lite'
import React from 'react'

interface MySliderProps{
  value:number, setValue(v:number):void
}

const MAX = 30
const MySlider: React.FC<MySliderProps> = (props) => {
  return <Grid container={true} spacing={2}><Slider value={props.value} min={0} max={MAX}
  track={false} valueLabelDisplay="auto" aria-labelledby="continuous-slider" style={{width:200}}
  onChange={(ev, val) => props.setValue(val as number)} valueLabelFormat={v => v === MAX ? '∞' : v.toString()}
  /></Grid>
}

export const RemoteTrackLimitControl: React.FC<Stores> = (props:Stores) => {
  const roomInfo = props.roomInfo
  const local = props.participants.local
  const videoLimit = useObserver(() => local.remoteVideoLimit)
  const audioLimit = useObserver(() => local.remoteAudioLimit)
  const videoSlider = <MySlider value={videoLimit >= 0 ? videoLimit : MAX}
    setValue={(v) => {
      local.remoteVideoLimit = v === MAX ? -1 : v
    } } />
  const audioSlider = <MySlider value={audioLimit >= 0 ? audioLimit : MAX}
    setValue={(v) => {
      local.remoteAudioLimit = v === MAX ? -1 : v
    } } />

  return <>
  <Box sx={{mt:4}}>
  <FormControlLabel
    control={videoSlider}
    label={t('videoLimit')}
  />
  <FormControlLabel
    control={audioSlider}
    label={t('audioLimit')}
  />
  </Box>
  <Grid container justifyContent="flex-end">
  <Button variant="contained" color={roomInfo.passMatched ? 'primary' : 'default'}
      style={{textTransform:'none'}} disabled={!roomInfo.passMatched}
      onClick = { () => {
        if (roomInfo.passMatched){
          conference.dataConnection.sync.sendTrackLimits('', [local.remoteVideoLimit, local.remoteAudioLimit])
        }
      }}
  >Sync limits</Button> </Grid>
  </>
}
RemoteTrackLimitControl.displayName = 'RemoteTrackLimitControl'
