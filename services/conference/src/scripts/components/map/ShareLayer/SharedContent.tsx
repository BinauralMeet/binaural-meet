import {makeStyles} from '@material-ui/core/styles'
import React, {useRef, useEffect, useState} from 'react'
import {SharedContent as ISharedContent} from '@models/SharedContent'
import {subV, useGesture} from 'react-use-gesture'
import { default as participants } from '@stores/Participants'
import { Content } from './Content'

const useStyles = makeStyles({
  cont: (props: ISharedContent) => ({
    position: 'absolute',
    left: props.pose.position[0],
    top: props.pose.position[1],
    transform:'rotate(' + props.pose.orientation + 'deg)',
  }),
})

export const SharedContent: React.FC<any> = (props) => {
  const cont = props.content as ISharedContent
  const classes = useStyles(cont)
  return (
    <div className={classes.cont}>
      <Content content = {cont} />
    </div>
  )
}
