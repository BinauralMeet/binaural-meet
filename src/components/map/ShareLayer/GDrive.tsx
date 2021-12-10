import {makeStyles} from '@material-ui/core/styles'
import {t} from '@models/locales'
import {assert} from '@models/utils'
import {getGDriveUrl, getInformationOfGDriveContent, getParamsFromUrl,
  getStringFromParams, isGDrivePreviewScrollable} from '@stores/sharedContents/SharedContentCreator'
import _ from 'lodash'
import {useObserver} from 'mobx-react-lite'
import React, {useEffect, useRef} from 'react'
import {ContentProps} from './Content'

// config.js
declare const config:any             //  from ../../config.js included from index.html

const useStyles = makeStyles({
  iframe: {
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
  },
  iframeEdit: {
    width: '100%',
    height: '100%',
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
  divError:{
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    backgroundColor: 'white',
  },
})

interface Member{
  props: ContentProps
  params: Map<string, string>
  scrolling: boolean
  onscroll:()=>void
}

function updateUrl(member: Member) {
  const url = getStringFromParams(member.params)

  if (url !== member.props.content.url && member.props.updateAndSend) {
    member.props.content.url = url
    member.props.updateAndSend(member.props.content)
  }
}

export const GDrive: React.FC<ContentProps> = (props:ContentProps) => {
  assert(props.content.type === 'gdrive')
  const divScroll = useRef<HTMLDivElement>(null)
  const contents = props.stores.contents
  const params = getParamsFromUrl(props.content.url)
  const fileId = params.get('id')
  const mimeType = params.get('mimeType')
  const memberRef = useRef<Member>({props, params, scrolling:false, onscroll:()=>{}})
  const member = memberRef.current
  member.props = props
  member.params = params
  if (!mimeType && fileId) {
    getInformationOfGDriveContent(fileId).then((res)=>{
      if ((res.name && props.content.name !== res.name) || res.mimeType){
        member.params.set('mimeType', res.mimeType)
        console.log(`mime: ${res.mimeType}`, res)
        if (res.name){ props.content.name = res.name }
        updateUrl(member)
      }
    }).catch(reason=>{
      console.log(`GDrive failed ${reason.body}`)
      if (reason.status === 404){
        console.log('404 may be video')
        member.params.set('mimeType', 'video')
        updateUrl(member)
      }
    })
  }
  //  console.log(`Name:${props.content.name} mime: ${mimeType}`)
  const classes = useStyles(props)
  const editing = useObserver(() => props.stores.contents.editing === props.content.id)
  const url = getGDriveUrl(editing, member.params)

  //  scroll to given 'top' param
  useEffect(() => {
    const top = Number(member.params.get('top'))
    if (!editing && !member.scrolling && divScroll.current
      && !isNaN(top) && top !== divScroll.current.scrollTop) {
      divScroll.current.onscroll = () => {}
      divScroll.current.scrollTop = top
      setTimeout(()=>{
        if (divScroll.current){ divScroll.current.onscroll = member.onscroll }
      }, 100)
      //  console.log(`scrool to top=${top}`)
    }
  })

  //  Set onscroll handler setting 'top' param
  useEffect(() => {
    function doSendScroll() {
      const top = Number(member.params.get('top'))
      if (divScroll.current && divScroll.current.scrollTop !== top) {
        //  console.log(`doSendScrool top=${divScroll.current.scrollTop}`)
        member.params.set('top', divScroll.current.scrollTop.toString())
        updateUrl(member)
      }
    }
    if (divScroll.current) {
      const mine = config.bmRelayServer || contents.localParticipant.myContents.has(props.content.id)
      const INTERVAL = 100
      const sendScroll = mine ? _.throttle(() => setTimeout(doSendScroll, INTERVAL), INTERVAL)
        : _.debounce(doSendScroll, INTERVAL)
      const endScroll = _.debounce(() => {
        member.scrolling = false
        //  console.log(`scrolling: ${member.current.scrolling}`)
      },                           INTERVAL)
      member.onscroll = () => {
        member.scrolling = true
        //  console.log(`scrolling: ${member.current.scrolling}`)
        sendScroll()
        endScroll()
      }

      divScroll.current.onscroll = member.onscroll
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.bmRelayServer ? contents.roomContents : contents.localParticipant.myContents, props.content.id])

  const vscroll = isGDrivePreviewScrollable(mimeType)

  return <div className={mimeType ? classes.divClip : classes.divError} >
    {mimeType ?
      <div className={(editing || !vscroll) ? classes.divClip : classes.divScroll} ref={divScroll}
        onWheel = {ev => ev.ctrlKey || ev.stopPropagation() } >
        <iframe src={url} title={props.content.url}
          className={editing ? classes.iframeEdit : vscroll ? classes.iframeVScrool : classes.iframe}
        />
    </div> :
    !editing ? <div style={{margin:'1em', whiteSpace:'pre-wrap'}}>{t('gdFailed')}</div> :
      <div className={classes.divClip} onWheel = {ev => ev.ctrlKey || ev.stopPropagation() } >
      <iframe src={url} title={props.content.url}
        className={classes.iframeEdit}
      />
      </div>
    }
  </div>
}
