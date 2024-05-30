import {makeStyles} from '@material-ui/core/styles'
import {isContentWallpaper} from '@models/ISharedContent'
import _ from 'lodash'
import {Observer} from 'mobx-react-lite'
import React from 'react'
import {PastedContent} from './PastedContent'
import {SharedContent} from './SharedContent'
import {contents} from '@stores/'
import {MapProps} from '../map'

const useStyles = makeStyles({
  slContainer:{
    userDrag: 'none',
    userSelect: 'none',
  },
})

export const ShareLayer: React.FC<MapProps> = (props) => {
  const classes = useStyles()

  return  <div className={classes.slContainer} >
    <Observer>{
      ()=>{
        const filtered = props.transparent ?
          contents.all.filter(c => !isContentWallpaper(c)) : contents.all

        return <>{
          filtered.map(val =>
            <SharedContent key={val.id} content={val} />)
        }</>
      }
    }</Observer>
    <PastedContent />
  </div>
}

ShareLayer.displayName = 'ShareLayer'
