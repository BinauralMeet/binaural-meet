import {Stores} from '@components/utils'
import FormControlLabel from '@material-ui/core/FormControlLabel'
import Grid from '@material-ui/core/Grid'
import Slider from '@material-ui/core/Slider'
import {t} from '@models/locales'
import React from 'react'
import { useObserver } from 'mobx-react-lite'

interface MySliderProps{
  value:number, setValue(v:number):void
}

const MAX = 30
const MySlider: React.FC<MySliderProps> = (props) => {
  return <Grid container={true} spacing={2}>
    <Slider value={props.value} min={0} max={MAX}
      track={false} valueLabelDisplay="auto" aria-labelledby="continuous-slider"
      style={{width:200}}
      onChange={(ev, val) => props.setValue(val as number)}
      valueLabelFormat={v => v === MAX ? '∞' : v.toString()}
    />
  </Grid>
}

export const RemoteTrackLimitControl: React.FC<Stores> = (props:Stores) => {
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
    <FormControlLabel
      control={videoSlider}
      label={t('stVideoLimit')}
      labelPlacement='start'
    />
    <FormControlLabel
      control={audioSlider}
      label={t('stAudioLimit')}
      labelPlacement='start'
    />
  </>
}
RemoteTrackLimitControl.displayName = 'RemoteTrackLimitControl'
