import {BaseProps} from '@components/utils'
import React from 'react'

import { makeStyles } from '@material-ui/core/styles';
import Fab from '@material-ui/core/Fab';
import AddIcon from '@material-ui/icons/Add';
import EditIcon from '@material-ui/icons/Edit';
import FavoriteIcon from '@material-ui/icons/Favorite';
import NavigationIcon from '@material-ui/icons/Navigation';

const useStyles = makeStyles((theme) => ({
  box: {
    position: "absolute",
    bottom: 0
  },
  margin: {
    margin: theme.spacing(1),
  }
}));


export const Footer: React.FC<BaseProps> = (props) => {
  const classes = useStyles();
  return (
    <div className={classes.box}>
    <Fab className={classes.margin} size = "small" color="primary" aria-label="add">
    <AddIcon />
    </Fab>
    < Fab className={classes.margin} size = "small" color="secondary" aria-label="edit">
        <EditIcon />
    </Fab>
    <Fab size = "small" variant="extended">
      <NavigationIcon className={classes.margin} />
      Navigate
    </Fab>
    <Fab className={classes.margin} size = "small" disabled aria-label="like">
      <FavoriteIcon />
    </Fab> </div>
  )
}
Footer.displayName = 'Footer'
