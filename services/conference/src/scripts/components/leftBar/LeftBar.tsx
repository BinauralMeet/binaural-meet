import {makeStyles} from '@material-ui/core'
import React from 'react'
import {ParticipantList} from './ParticipantList'

const useStyles = makeStyles({
  container: {
    height: '100%',
  },
})

export const LeftBar: React.FC = () => {
  const classes = useStyles()

  return (
    <div className={classes.container} >
      <ParticipantList />
    </div>
  )
}
LeftBar.displayName = 'LeftBar'
