import {BaseProps} from '@components/utils'
import {makeStyles} from '@material-ui/core/styles'
import _ from 'lodash'
import {Observer} from 'mobx-react-lite'
import React from 'react'
import {PastedContent} from './PastedContent'
import {SharedContent} from './SharedContent'

const useStyles = makeStyles({
  slContainer:{
    backgroundColor: 'rgba(255,0,0,0.2)',
    userDrag: 'none',
    userSelect: 'none',
  },
})


export const ShareLayer = React.memo<BaseProps>(
  (props) => {
    const classes = useStyles()

    return  <div className={classes.slContainer} >
      <Observer>{
        ()=>{
          const all = Array.from(props.contents.all)
          if (props.transparent) {
            const firstIdx = all.findIndex(content => !content.isBackground())
            all.splice(0, firstIdx !== -1 ? firstIdx : all.length)
          }

          return <>{
            all.map(val =>
              <SharedContent key={val.id} content={val} {...props} />)
          }</>
        }
      }</Observer>
    <PastedContent {...props} />
    </div>
  },
  (prev, next) => {
    return _.isEqual(prev.contents.all, next.contents.all) && prev.transparent === next.transparent
  },
)
ShareLayer.displayName = 'ShareLayer'
