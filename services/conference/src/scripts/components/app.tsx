import {makeStyles} from '@material-ui/core/styles'
import React from 'react'
import {Map} from './map/map'
import {Footer} from './footer/footer'

const useStyles = makeStyles({
  map: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: '100%',
    width: '100%',
    overflow: 'hidden',
  },
})

export const App: React.FC<{}> = () => {
  const classes = useStyles()

  return (
    <div className={classes.map}>
      <Map />
      {/* <Footer />  */}
    </div>
  )
}
App.displayName = 'App'
