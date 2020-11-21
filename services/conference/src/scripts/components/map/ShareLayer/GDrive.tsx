import {useStore as useParticipants} from '@hooks/ParticipantsStore'
import {Tooltip} from '@material-ui/core'
import {makeStyles} from '@material-ui/core/styles'
import {TextPhrase} from '@models/SharedContent'
import {assert} from '@models/utils'
import {getRandomColorRGB, rgba} from '@stores/utils'
import _ from 'lodash'
import {useObserver} from 'mobx-react-lite'
import React, {useRef, useState} from 'react'
import {ContentProps} from './Content'

const useStyles = makeStyles({
  iframe: {
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    border: '2px gray solid',
  },
  iframeEdit: {
    width: '100%',
    height: '100%',
    border: '2px yellow solid',
  },
  div:{
    width: '100%',
    height: '100%',
  },
})


export const GDrive: React.FC<ContentProps> = (props:ContentProps) => {
  assert(props.content.type === 'gdrive')
  const classes = useStyles()
  const url = `https://drive.google.com/file/d/${props.content.url}/preview`

  return <div className={classes.div}
    onDoubleClick = {() => { if (!props.editing) { props.setEditing(true) } }}
    onPointerLeave = {() => { if (props.editing) { props.setEditing(false) } }}
  >
    <iframe className={props.editing ? classes.iframeEdit : classes.iframe} src={url} />
  </div>
}
