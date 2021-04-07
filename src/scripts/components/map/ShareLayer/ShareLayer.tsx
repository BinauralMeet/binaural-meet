import {makeStyles} from '@material-ui/core/styles'
import _ from 'lodash'
import {useObserver} from 'mobx-react-lite'
import React from 'react'
import {Stores} from '../../utils'
import {PastedContent} from './PastedContent'
import {SharedContent} from './SharedContent'

const useStyles = makeStyles({
  slContainer:{
    backgroundColor: 'rgba(255,0,0,0.2)',
    userDrag: 'none',
    userSelect: 'none',
  },
})


export const ShareLayer = React.memo<Stores>(
  (props) => {
    const classes = useStyles()
    const contents = useObserver(() =>
      props.contents.all.map(val =>
        <SharedContent key={val.id} content={val} editing={props.contents.editingId === val.id} {...props} />))

    return  <div className={classes.slContainer} >
      {contents}
    <PastedContent />
    </div>
  },
  (prev, next) => {
    return _.isEqual(prev.contents.all, next.contents.all)
  },
)
ShareLayer.displayName = 'ShareLayer'
