import {makeStyles} from '@material-ui/core/styles'
import {t} from '@models/locales'
import {assert} from '@models/utils'
import {MIMETYPE_GOOGLE_APP_PRESENTATION, getGDriveUrl, getInformationOfGDriveContent, getPage, getSlides, isGDrivePreviewScrollable} from '@stores/sharedContents/GDriveUtil'
import {Observer} from 'mobx-react-lite'
import React, {useEffect, useRef} from 'react'
import {ContentProps} from './Content'
import axios from 'axios'
import { PageControl } from './PageControl'
import { getParamsFromUrl, getStringFromParams } from '@stores/sharedContents/SharedContentCreator'
import _ from 'lodash'
import {contents, roomInfo} from '@stores/'

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

export interface Member{
  props: ContentProps
  params: Map<string, string>
  scrolling:boolean
  prevToken?: string
  onscroll: ()=>void
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

  const paramsFromUrl = getParamsFromUrl(props.content.url)
  const fileId = paramsFromUrl.get('id')
  const memberRef = useRef<Member>({props, params:paramsFromUrl, scrolling:false, onscroll:()=>{}})
  const member = memberRef.current
  member.props = props
  member.params = paramsFromUrl

  //  Scroll to given 'top' param
  useEffect(() => {
    const top = Number(member.params.get('top'))
    const editing = contents.editing === props.content.id
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
    //console.log('useEffect() for onscroll called.')
    function doSendScroll() {
      const editing = contents.editing === props.content.id
      if (editing){

      }else{
        const top = Number(member.params.get('top'))
        if (divScroll.current && divScroll.current.scrollTop !== top) {
          //  console.log(`doSendScrool top=${divScroll.current.scrollTop}`)
          member.params.set('top', divScroll.current.scrollTop.toString())
          updateUrl(member)
        }
      }
    }
    if (divScroll.current) {
      const INTERVAL = 100
      const sendScroll = _.throttle(() => setTimeout(doSendScroll, INTERVAL), INTERVAL)
      const endScroll = _.debounce(() => {
        member.scrolling = false
        //  console.log(`scrolling: ${member.scrolling}`)
      },                           INTERVAL)
      member.onscroll = () => {
        member.scrolling = true
        //  console.log(`scrolling: ${member.scrolling}`)
        sendScroll()
        endScroll()
      }

      divScroll.current.onscroll = member.onscroll
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [divScroll.current, contents.roomContents])

  //  console.log(`Name:${props.content.name} mime: ${mimeType}`)
  const classes = useStyles(props)
  const mimeType = member.params.get('mimeType')
  const page = getPage(member.params)
  const slides = getSlides(member.params)

  return <Observer>{()=>{
    const vscroll = isGDrivePreviewScrollable(mimeType)
    //  console.log(`vscroll=${vscroll}  mimeType=${mimeType}`)
    if (fileId && (!mimeType || member.prevToken !== roomInfo.gDriveToken)) {
      member.prevToken = roomInfo.gDriveToken
      //  console.log(`GDrive: id:${fileId}, mime:${mimeType}  token:${member.prevToken}`)
      getInformationOfGDriveContent(fileId).then((res)=>{
        if ((res.name && props.content.name !== res.name) || res.mimeType){
          if (res.mimeType) member.params.set('mimeType', res.mimeType)
          if (res.name){ props.content.name = res.name }
          if (res.mimeType === MIMETYPE_GOOGLE_APP_PRESENTATION){
            const slides = getSlides(member.params)
            if (slides.length === 0){
              const gas = 'https://script.google.com/macros/s/AKfycbxZYIKpZy6Dj7t38NWDv1ExO03ly1HKQPHd0Z41vYmD7WDrFslgSx95iDBSoUXZtmZP/exec'
              const app = 'presentation'
              const url = `https://docs.google.com/${app}/d/${fileId}/edit`
              axios.get(`${gas}?url=${url}`).then(res => {
                member.params.set('slides', JSON.stringify(res.data.slides))
              }).catch(e=>{
                console.warn('Google App Script "Slides to ids" by hasevr@gs.haselab.net returns an error.', e)
              }).finally(()=>{
                updateUrl(member)
              })
            }
          }else{
            updateUrl(member)
          }
        }
      }).catch(reason=>{
        member.params.set('mimeType', 'unknown')
        updateUrl(member)
      })
    }
    const editing = contents.editing === props.content.id
    //  console.log(`getDriveUrl: ${editing}, ${JSON.stringify(Array.from(member.params))}`)
    const url = getGDriveUrl(editing, member.params)
    //  console.log(`getDriveUrl: ${editing}, ${JSON.stringify(Array.from(member.params))}`)

    return <div className={mimeType ? classes.divClip : classes.divError} >
    {mimeType ?
      <div className={(editing || !vscroll) ? classes.divClip : classes.divScroll} ref={divScroll}
        onWheel = {ev => vscroll && (ev.ctrlKey || ev.stopPropagation()) }>
        <iframe src={url} title={props.content.url}
          className={editing ? classes.iframeEdit : vscroll ? classes.iframeVScrool : classes.iframe}/>
      </div>
    :
      !editing ?
        <div style={{margin:'1em', whiteSpace:'pre-wrap'}}>{t('gdFailed')}</div>
      : <div className={classes.divClip} onWheel = {ev => ev.ctrlKey || ev.stopPropagation() } >
          <iframe src={url} title={props.content.url} className={classes.iframeEdit} />
        </div>
    }
    {mimeType === MIMETYPE_GOOGLE_APP_PRESENTATION ?
      <PageControl page={page} numPages={slides.length} onSetPage={(p)=>{
        if (page != p){
          member.params.set('page', p.toString())
          updateUrl(member)
        }
      }}/>
      : undefined }
  </div>
  }}</Observer>
}
