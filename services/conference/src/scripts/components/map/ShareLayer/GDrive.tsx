import {makeStyles} from '@material-ui/core/styles'
import {assert} from '@models/utils'
import {defaultValue} from '@stores/sharedContents/SharedContentCreator'
import _ from 'lodash'
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
  divScroll:(props:ContentProps) => ({
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

interface Member{
  props: ContentProps
  params: Map<string, string>
}

function isPreviewScroll(mimeType: string) {
  return true //  mimeType === ''
}
function onUpdateParam(member: Member) {
  let url = ''
  member.params.forEach((val, key) => {
    url = `${url}${url ? '&' : ''}${key}=${val}`
  })

  if (url !== member.props.content.url && member.props.onUpdate) {
    const newContent = Object.assign({}, member.props.content)
    newContent.isEditable = defaultValue.isEditable
    newContent.url = url
    member.props.onUpdate(newContent)
  }
}

export const GDrive: React.FC<ContentProps> = (props:ContentProps) => {
  assert(props.content.type === 'gdrive')
  const params = new Map(props.content.url.split('&').map(str => str.split('=') as [string, string]))
  const fileId = params.get('id')
  const [mimeType, setMimeType] = useState('')
  const divScroll = useRef<HTMLDivElement>(null)
  const member = useRef<Member>({props, params})
  member.current.props = props
  member.current.params = params
  if (!mimeType) {
    const API_KEY = 'AIzaSyDDvlkJQNwsEWGB5owuz977QShoaBoVbzc'
    if (gapi) {
      gapi.client.setApiKey(API_KEY)
      gapi.client.load('drive', 'v3', () => {
        gapi.client.drive.files.get({
          fileId,
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
  const url = `https://drive.google.com/file/d/${fileId}/preview`

  useEffect(() => {
    const top = Number(member.current.params.get('top'))
    if (divScroll.current && top && top !== divScroll.current.scrollTop) {
      const onscroll = divScroll.current.onscroll
      divScroll.current.onscroll = () => {}
      divScroll.current.scrollTop = top
      divScroll.current.onscroll = onscroll
      console.log(`scrool to top=${top}`)
    }
  })
  useEffect(() => {
    if (divScroll.current) {
      divScroll.current.onscroll = () => {
        const top = Number(member.current.params.get('top'))
        if (divScroll.current && divScroll.current.scrollTop !== top) {
          console.log(`onscrool top=${divScroll.current.scrollTop}`)
          member.current.params.set('top', divScroll.current.scrollTop.toString())
          onUpdateParam(member.current)
        }
      }
    }
  },        [divScroll.current])

  const vscroll = isPreviewScroll(mimeType)

  return <div className={classes.divClip}
    onDoubleClick = {() => { if (!props.editing) { props.setEditing(true) } }}
    onPointerLeave = {() => { if (props.editing) { props.setEditing(false) } }}
  >
    <div className={props.editing || !vscroll ? classes.divClip : classes.divScroll} ref={divScroll}>
      <iframe src={url}
        className={props.editing ? classes.iframeEdit : vscroll ? classes.iframeVScrool : classes.iframe}
      />
    </div>
  </div>
}
