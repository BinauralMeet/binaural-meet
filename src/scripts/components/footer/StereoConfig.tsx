import Grid from '@material-ui/core/Grid'
import Popover from '@material-ui/core/Popover'
import Slider from '@material-ui/core/Slider'
import {makeStyles} from '@material-ui/core/styles'
import RolloffNearIcon from '@material-ui/icons/SignalWifi1Bar'
import RolloffFarIcon from '@material-ui/icons/SignalWifi3Bar'
import {assert} from '@models/utils'
import {stereoParametersStore} from '@stores/AudioParameters'
import {useObserver} from 'mobx-react-lite'
import React from 'react'

const useStyles = makeStyles((theme) => {
  return ({
    margin:{
      margin:'1em',
    },
    slider:{
      width:300,
    },
  })
})


export interface StereoConfigProp{
  anchorEl: Element|null
  onClose: () => void
}

export const StereoConfig: React.FunctionComponent<StereoConfigProp> = (props: StereoConfigProp) => {
  const classes = useStyles()
  const hearableRange = useObserver(() => Math.round(stereoParametersStore.hearableRange))
  //  1 / ( 1 + rolloff/refDist * (Max(dist/refDist, 1) - 1) )
  const handleChange = (event: React.ChangeEvent<{}>, value: number | number[]) => {
    assert(typeof value === 'number')
    stereoParametersStore.setHearableRange(value)
    console.log(`slider: ${value}`)
  }

  return <Popover
    open={props.anchorEl !== null} onClose={props.onClose}
    anchorReference={'anchorEl'}
    anchorEl={props.anchorEl}
  >
    <div className={classes.margin}>
    <h3>Audio attenuation setting</h3>
    <Grid container={true} spacing={2}>
        <Grid item={true}>
        Hearable range:
        </Grid>
        <Grid item={true}>
          <RolloffNearIcon />
        </Grid>
        <Grid item={true} xs={true}>
        <Slider className={classes.slider} value={hearableRange}
          onChange={handleChange}
          track={/*'normal'*/ false}
          valueLabelDisplay="auto"
          getAriaValueText={valuetext} // marks={marks}
          aria-labelledby="continuous-slider" />
        </Grid>
        <Grid item={true}>
          <RolloffFarIcon />
        </Grid>
      </Grid>


    </div>
  </Popover>
}
StereoConfig.displayName = 'ConfigurationDialog'

function valuetext(value:number) {
  return `${value}%`
}

const marks = [
  {
    value: 0,
    label: '0°C',
  },
  {
    value: 20,
    label: '20°C',
  },
  {
    value: 37,
    label: '37°C',
  },
  {
    value: 100,
    label: '100°C',
  },
]
