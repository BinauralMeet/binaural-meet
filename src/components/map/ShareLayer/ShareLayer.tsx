import {BaseProps} from '@components/utils'
import {makeStyles} from '@material-ui/core/styles'
import {isContentWallpaper} from '@stores/sharedContents/SharedContentCreator'
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

export const ShareLayer = React.memo<BaseProps>(
  (props) => {
    const classes = useStyles()

    return  <div className={classes.slContainer} >
      <Observer>{
        ()=>{
          const all = Array.from(props.contents.all)
          const filtered = props.transparent ? all.filter(c => !isContentWallpaper(c)) : all

          return <>{
            filtered.map(val =>
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
