import {useStore as useParticipants} from '@hooks/ParticipantsStore'
import {Tooltip} from '@material-ui/core'
import {makeStyles} from '@material-ui/core/styles'
import {TextPhrase} from '@models/SharedContent'
import {assert} from '@models/utils'
import {getRandomColorRGB, rgba} from '@stores/utils'
import _ from 'lodash'
import {useObserver} from 'mobx-react-lite'
import React, {useEffect, useRef, useState} from 'react'
import {ContentProps} from './Content'

declare const gapi:any     //  google api from index.html


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
  iframeVScrool: (props: ContentProps) => ({
    width:props.content.size[0] + 13 + 10,
    height: props.content.size[0] * 100,
  }),
  divCanvas:(props:ContentProps) => ({
    width:props.content.size[0] + 100,
    height: '100%',
    position:'relative',
    left:-13,
    overflow:'scroll',
  }),
  divClip:{
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
})

function isPreviewScroll(mimeType: string) {
  return true //  mimeType === ''
}

export const GDrive: React.FC<ContentProps> = (props:ContentProps) => {
  assert(props.content.type === 'gdrive')
  const [mimeType, setMimeType] = useState('')
  if (!mimeType) {
    const API_KEY = 'AIzaSyDDvlkJQNwsEWGB5owuz977QShoaBoVbzc'
    if (gapi) {
      gapi.client.setApiKey(API_KEY)
      gapi.client.load('drive', 'v3', () => {
        gapi.client.drive.files.get({
          fileId: props.content.url,
          fields:'mimeType',
        })
        .then((result:any) => {
          const body = JSON.parse(result.body)
          //  console.log('GAPI Result:', body.mimeType)
          setMimeType(body.mimeType)
        })
      })
    }
  }
  const classes = useStyles(props)
  const url = `https://drive.google.com/file/d/${props.content.url}/preview`

  let content
  if (props.editing) {
    content = <iframe className={classes.iframeEdit}
      src={url} />
  }else {
    if (isPreviewScroll(mimeType)) {
      content = <div className={classes.divCanvas}>
        <iframe className={classes.iframeVScrool} src={url} />
      </div>
    }else {
      content = <iframe className={classes.iframe}
      src={url} />
    }
  }

  return <div className={classes.divClip}
    onDoubleClick = {() => { if (!props.editing) { props.setEditing(true) } }}
    onPointerLeave = {() => { if (props.editing) { props.setEditing(false) } }}
  >
    {content}
  </div>
}

