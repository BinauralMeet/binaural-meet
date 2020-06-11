import {Base} from '@components/map/Base'
import jitsiIcon from '@images/jitsi/Poweredby_Jitsi_logo_white_04_2020_white.png'
import {makeStyles} from '@material-ui/core/styles'
import React from 'react'

const SIZE = 5000

const useStyles = makeStyles({
  img: {
    position: 'absolute',
    transform: `translate(-${SIZE / 2}px, -${SIZE / 2}px)`,
    backgroundColor: '#DFDBE5',
    backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.4'%3E%3Cpath d='M50 50c0-5.523 4.477-10 10-10s10 4.477 10 10-4.477 10-10 10c0 5.523-4.477 10-10 10s-10-4.477-10-10 4.477-10 10-10zM10 10c0-5.523 4.477-10 10-10s10 4.477 10 10-4.477 10-10 10c0 5.523-4.477 10-10 10S0 25.523 0 20s4.477-10 10-10zm10 8c4.418 0 8-3.582 8-8s-3.582-8-8-8-8 3.582-8 8 3.582 8 8 8zm40 40c4.418 0 8-3.582 8-8s-3.582-8-8-8-8 3.582-8 8 3.582 8 8 8z' /%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
    height: SIZE,
    width: SIZE,
  },
  logo:{
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    margin: 'auto',
    height: '10em',
    userDrag: 'none',
    userSelect: 'none',
  },
})

export const Background: React.FC<{}> = () => {
  const classes = useStyles()

  return (
    <div className={classes.img}>
      <img className={classes.logo} src={jitsiIcon} />
    </div>
  )
}
Background.displayName = 'Background'
