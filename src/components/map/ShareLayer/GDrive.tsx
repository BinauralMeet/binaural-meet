import {useStore} from '@hooks/SharedContentsStore'
import {makeStyles} from '@material-ui/core/styles'
import {assert} from '@models/utils'
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
    pointerEvents: 'none',
  }),
  divScroll:(props:ContentProps) => ({
    width:props.content.size[0] + 100,
    height: '100%',
    position:'relative',
    left:-15,
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
  scrolling: boolean
}

function isPreviewScroll(mimeType: string) {
  return !(
    mimeType === 'application/vnd.google-apps.presentation'
    || mimeType === 'application/vnd.google-apps.spreadsheet'
    || mimeType.slice(0, 5) === 'image'
    || mimeType.slice(0, 5) === 'video'
    || mimeType.slice(0, 5) === 'audio'
  )
}
function updateUrl(member: Member) {
  let url = ''
  member.params.forEach((val, key) => {
    url = `${url}${url ? '&' : ''}${key}=${val}`
  })

  if (url !== member.props.content.url && member.props.onUpdate) {
    const newContent = Object.assign({}, member.props.content)
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
  const contents = useStore()
  const member = useRef<Member>({props, params, scrolling:false})
  member.current.props = props
  member.current.params = params
  if (!mimeType) {
    //  console.log('GAPI try to get mimeType')
    const API_KEY = 'AIzaSyCE4B2cKycH0fVmBznwfr1ynnNf2qNEU9M'
    if (gapi) {
      gapi.client.setApiKey(API_KEY)
      gapi.client.load('drive', 'v3', () => {
        gapi.client.drive.files.get({
          fileId,
          fields:'mimeType,name',
        })
        .then((result:any) => {
          const body = JSON.parse(result.body)
          //  console.log(`GAPI mimeType:${body.mimeType}  name:${body.name}`)
          setMimeType(body.mimeType)
          if (body.name && props.content.name !== body.name && props.onUpdate) {
            props.content.name = body.name
            const newContent = Object.assign({}, props.content)
            props.onUpdate(newContent)
          }
        }).catch((reason:any) => {
          console.debug('GAPI error', reason)
          setMimeType('application/vnd.google-apps.failed')
        })
      })
    }
  }
  const classes = useStyles(props)
  const url = `https://drive.google.com/file/d/${fileId}/preview`

  //  scroll to given 'top' param
  useEffect(() => {
    const top = Number(member.current.params.get('top'))
    if (!member.current.scrolling && divScroll.current
      && !isNaN(top) && top !== divScroll.current.scrollTop) {
      const onscroll = divScroll.current.onscroll
      divScroll.current.onscroll = () => {}
      divScroll.current.scrollTop = top
      divScroll.current.onscroll = onscroll
      //  console.log(`scrool to top=${top}`)
    }
  })

  //  Set onscroll handler setting 'top' param
  useEffect(() => {
    function doSendScroll() {
      const top = Number(member.current.params.get('top'))
      if (divScroll.current && divScroll.current.scrollTop !== top) {
        //  console.log(`doSendScrool top=${divScroll.current.scrollTop}`)
        member.current.params.set('top', divScroll.current.scrollTop.toString())
        updateUrl(member.current)
      }
    }
    if (divScroll.current) {
      const mine = contents.localParticipant.myContents.has(props.content.id)
      const INTERVAL = 100
      const sendScroll = mine ? _.throttle(() => setTimeout(doSendScroll, INTERVAL), INTERVAL)
        : _.debounce(doSendScroll, INTERVAL)
      const endScroll = _.debounce(() => {
        member.current.scrolling = false
        //  console.log(`scrolling: ${member.current.scrolling}`)
      },                           INTERVAL)

      divScroll.current.onscroll = () => {
        member.current.scrolling = true
        //  console.log(`scrolling: ${member.current.scrolling}`)
        sendScroll()
        endScroll()
      }
    }
  },        [contents.localParticipant.myContents, props.content.id])

  const vscroll = isPreviewScroll(mimeType)

  return <div className={classes.divClip}
    onDoubleClick = {() => { if (!props.editing) { props.setEditing(true) } }}
    onPointerLeave = {() => { if (props.editing) { props.setEditing(false) } }}
  >
    <div className={(props.editing || !vscroll) ? classes.divClip : classes.divScroll} ref={divScroll}
      onWheel = {ev => ev.ctrlKey || ev.stopPropagation() } >
      <iframe src={url} title={props.content.url}
        className={props.editing ? classes.iframeEdit : vscroll ? classes.iframeVScrool : classes.iframe}
      />
    </div>
  </div>
}
