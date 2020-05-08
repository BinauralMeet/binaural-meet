import {Background} from '@components/map/Base/Background'
import {makeStyles} from '@material-ui/core'
import React from 'react'

const useStyles = makeStyles({
  root: {
    width: '80vw',
    height: '80vh',
    overflow: 'hidden',
    border: '1px solid black',
  },
})

const BackgroundStory: React.FC<{}> = () => {
  const classes = useStyles()

  return <div className={classes.root}>
    <Background />
  </div>
}

export default BackgroundStory
