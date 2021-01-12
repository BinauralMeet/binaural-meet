import {useStore} from '@hooks/ParticipantsStore'
import Container from '@material-ui/core/Container'
import FormControlLabel from '@material-ui/core/FormControlLabel'
import Grid from '@material-ui/core/Grid'
import Slider from '@material-ui/core/Slider'
import {connection} from '@models/api'
import {useObserver} from 'mobx-react-lite'
import React from 'react'

interface MySliderProps{
  value:number, setValue(v:number):void
}

const MAX = 50
const MySlider: React.FC<MySliderProps> = (props) => {
  return <Grid container={true} spacing={2}><Slider value={props.value} min={0} max={MAX}
  track={false} valueLabelDisplay="auto" aria-labelledby="continuous-slider" style={{width:200}}
  onChange={(ev, val) => props.setValue(val as number)} valueLabelFormat={v => v === MAX ? '∞' : v.toString()}
  /></Grid>
}

export const RemoteTrackLimitControl: React.FC<{}> = () => {
  const local = useStore().local
  const videoLimit = useObserver(() => local.remoteVideoLimit)
  const audioLimit = useObserver(() => local.remoteAudioLimit)
  const videoSlider = <MySlider value={videoLimit >= 0 ? videoLimit : MAX}
    setValue={(v) => {
      local.remoteVideoLimit = v === MAX ? -1 : v
      connection.conference.sync.sendTrackLimits('', [local.remoteVideoLimit, local.remoteAudioLimit])
    } } />
  const audioSlider = <MySlider value={audioLimit >= 0 ? audioLimit : MAX}
    setValue={(v) => {
      local.remoteAudioLimit = v === MAX ? -1 : v
      connection.conference.sync.sendTrackLimits('', [local.remoteVideoLimit, local.remoteAudioLimit])
    } } />

  return <><Container>
    <FormControlLabel
      control={videoSlider}
      label="Max remote videos"
    />
  </Container>
  <Container>
  <FormControlLabel
      control={audioSlider}
      label="Max remote audios"
    />
  </Container></>
}
RemoteTrackLimitControl.displayName = 'RemoteTrackLimitControl'
