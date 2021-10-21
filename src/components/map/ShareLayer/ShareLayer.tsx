import {MapProps} from '@components/utils'
import {makeStyles} from '@material-ui/core/styles'
import {isContentWallpaper} from '@models/ISharedContent'
import _ from 'lodash'
import {Observer} from 'mobx-react-lite'
import React from 'react'
import {PastedContent} from './PastedContent'
import {SharedContent} from './SharedContent'

const useStyles = makeStyles({
  slContainer:{
    userDrag: 'none',
    userSelect: 'none',
  },
})

export const ShareLayer = React.memo<MapProps>(
  (props) => {
    const contents = props.stores.contents
    const classes = useStyles()
    const {transparent, ...contentProps} = props

    return  <div className={classes.slContainer} >
      <Observer>{
        ()=>{
          const all = Array.from(contents.all)
          const filtered = props.transparent ? all.filter(c => !isContentWallpaper(c)) : all

          return <>{
            filtered.map(val =>
              <SharedContent key={val.id} content={val} {...contentProps} />)
          }</>
        }
      }</Observer>
    <PastedContent {...contentProps} />
    </div>
  },
  (prev, next) => {
    return _.isEqual(prev.stores.contents.all, next.stores.contents.all) && prev.transparent === next.transparent
  },
)
ShareLayer.displayName = 'ShareLayer'
