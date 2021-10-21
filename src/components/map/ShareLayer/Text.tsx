import {formatTimestamp} from '@components/utils'
import {textToLinkedText} from '@components/utils/Text'
import {Tooltip} from '@material-ui/core'
import {makeStyles} from '@material-ui/core/styles'
import {CSSProperties} from '@material-ui/styles'
import settings from '@models/api/Settings'
import {compTextMessage, TextMessage, TextMessages} from '@models/ISharedContent'
import {assert, findTextColorRGB} from '@models/utils'
import {getRandomColorRGB, rgba} from '@models/utils'
import _ from 'lodash'
import {Observer, useObserver} from 'mobx-react-lite'
import React, {useEffect, useRef} from 'react'
import {ContentProps} from './Content'

class TextMember{
  messages: TextMessage[] = []
  isStatic = false
  abortScroll = false
  editing = false
}
//  Update (send) the content if needed
function onUpdateTexts(messages: TextMessage[], div:HTMLDivElement, props: ContentProps) {
  const newTexts: TextMessages = {messages, scroll:[div.scrollLeft, div.scrollTop]}
  const newUrl = JSON.stringify(newTexts)
  if (props.content.url !== newUrl && props.updateAndSend) {
    props.content.url = newUrl
    props.updateAndSend(props.content)
  }
}


interface TextDivProps extends ContentProps{
  text: TextMessage
  textEditing: boolean
  textToShow: JSX.Element[]
  member: TextMember
  div: HTMLDivElement | null
  autoFocus: boolean
}
interface TextEditProps extends TextDivProps{
  css: React.CSSProperties
}

function sendText(text: string, props: TextEditProps){
  //  console.log(`send text ${text}`)
  props.text.message = text
  const messagesToSend = props.member.messages.filter(text => text.message.length)
  if (props.div){
    onUpdateTexts(messagesToSend, props.div, props)
  }
}


export const TextEdit: React.FC<TextEditProps> = (props:TextEditProps) => {
  const [text, setText] = React.useState(props.text.message)
  const sendTextLaterRef = useRef<any>(undefined)
  useEffect(() => {
    sendTextLaterRef.current = _.throttle(sendText, 1000, {leading: false})
  }, [])
  const sendTextLater = sendTextLaterRef.current

  return <Observer>{() =>
  <div style={{...props.css, position:'relative', margin:0, border:0, padding:0, backgroundColor:'none'}}>
    <div style={{...props.css, color:'red', position:'relative', width:'100%',
      overflow: 'hidden', visibility:'hidden'}}>{text+'\u200b'}</div>
    <textarea value={text} autoFocus={props.autoFocus}
      style={{...props.css, font: 'inherit', verticalAlign:'baseline', resize:'none',
      position:'absolute', top:0, left:0, width:'100%', height:'100%', border:'none',
      letterSpacing: 'inherit', overflow: 'hidden'
    }}
      onChange={(ev) => {
        setText(ev.currentTarget.value)
        if (sendTextLater){
          sendTextLater(ev.currentTarget.value, props)
        }
      }}
      onBlur={()=>{
        if (sendTextLater){ sendTextLater.cancel() }
        sendText(text, props)
      }}
      onFocus={()=>{

      }}
      onKeyDown={(ev) => {
        if (ev.key === 'Escape' || ev.key === 'Esc') {
          ev.stopPropagation()
          ev.preventDefault()
          if (sendTextLater){ sendTextLater.cancel() }
          sendText(text, props)
          props.stores.contents.setEditing('')
        }
      }}
    />
  </div>}</Observer>
}

export const TextDiv: React.FC<TextDivProps> = (props:TextDivProps) => {
  const timestamp = formatTimestamp(props.text.time)    //  make formated timestamp for tooltip
  const rgb = props.text.color?.length ? props.text.color : getRandomColorRGB(props.text.name)
  const textColor = props.text.textColor?.length ? props.text.textColor : findTextColorRGB(rgb)
  const css:CSSProperties = {
    color: rgba(textColor, 1),
    backgroundColor:settings.useTransparent ? rgba(rgb, 0.5) : rgba(rgb, 1),
    padding:'0.1em',
    fontSize: 16,
    lineHeight: 1.2,
    width:'100%',
    overflow: 'clip',
    boxSizing: 'border-box',
    whiteSpace: 'pre-wrap',
    wordWrap: 'break-word',
    overflowWrap: 'break-word',
  }
  const {backgroundColor, ...cssEdit} = css
  cssEdit.backgroundColor = rgba(rgb, 1)

  return <Tooltip title={<React.Fragment>{props.text.name} <br /> {timestamp}</React.Fragment>}
  placement="left" arrow={true} suppressContentEditableWarning={true}><div>
  {props.textEditing ? <TextEdit {...props} css={cssEdit} /> :
  <div style={css}
    //  Select text by static click
    onPointerDown={()=>{ props.member.isStatic = true }}
    onPointerMove={()=>{ props.member.isStatic = false }}
    onPointerUp={(ev)=>{
      if (!props.member.isStatic){ return }
      const target = ev.target
      if (target instanceof Node){
        ev.preventDefault()
        const selection = window.getSelection()
        if (selection){
          if (selection.rangeCount && selection.getRangeAt(0).toString()){
            selection.removeAllRanges()
          }else{
            const range = document.createRange()
            range.selectNode(target)
            selection.removeAllRanges()
            selection.addRange(range)
          }
        }
      }
    }}
  >
    {props.textToShow}
  </div>}
  </div></Tooltip>
}

const cssText: CSSProperties = {
  height: '100%',
  width: '100%',
  whiteSpace: 'pre-line',
  pointerEvents: 'auto',
  overflowY: 'auto',
  overflowX: 'visible',
  wordWrap: 'break-word',
}
const useStyles = makeStyles({
  text: cssText,
  textEdit: {
    ...cssText,
    cursor: 'default',
    userSelect: 'text',
  },
})

export const Text: React.FC<ContentProps> = (props:ContentProps) => {
  assert(props.content.type === 'text')
  const {contents, participants} = props.stores
  const memberRef = React.useRef<TextMember>(new TextMember())
  const member = memberRef.current
  const classes = useStyles()
  const ref = useRef<HTMLDivElement>(null)
  const url = props.content.url
  const newTexts = JSON.parse(url) as TextMessages
  //const refEdit = useRef<HTMLDivElement>(null)
  const editing = useObserver(() => contents.editing === props.content.id)
  if (editing){
    contents.setBeforeChangeEditing((cur, next) => {
      if (cur === props.content.id && next === ''){
        if (ref.current){
          member.messages = member.messages.filter(text => text.message.length)
          onUpdateTexts(member.messages, ref.current, props)
        }
        contents.setBeforeChangeEditing() //  clear me
      }
    })
  }
  useEffect(() => {
    if (!editing && ref.current) {
      if (ref.current.scrollLeft!==newTexts.scroll[0] || ref.current.scrollTop!==newTexts.scroll[1]){
        member.abortScroll = true
        ref.current?.scroll(newTexts.scroll[0], newTexts.scroll[1])
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },        [newTexts.scroll[0], newTexts.scroll[1], editing])

  //  Update remote messages
  const indices = new Set<number>()
  newTexts.messages.forEach((newMessage) => {
    const index = member.messages.findIndex(msg => msg.pid === newMessage.pid && msg.time === newMessage.time)
    if (index === -1) {
      indices.add(member.messages.length)
      member.messages.push(newMessage)       //  Add new messages
    }else if (newMessage.pid !== participants.localId){
      indices.add(index)
      member.messages[index] = newMessage  //  Update remote messages
    }
  })
  //  remove removed messages
  member.messages = member.messages.filter((msg, idx) =>
    msg.pid === participants.localId || indices.has(idx))
  member.messages.sort(compTextMessage)

  let focusToEdit:undefined|TextMessage = undefined
  if (editing) {
    //  Make a new message to edit if needed.
    const last = member.messages.pop()
    if (last) {
      member.messages.push(last)
    }
    if (last?.pid !== participants.localId) {
      member.messages.push({message:'', pid:participants.localId,
        name:participants.local.information.name,
        color: participants.local.information.color,
        textColor: participants.local.information.textColor,
        time:Date.now()})
    }
    if (!member.editing) {  //  Find the message to focus to edit, i.e. my last message.
      member.messages.reverse()
      focusToEdit = member.messages.find(message => message.pid === participants.localId)
      member.messages.reverse()
    }
  }

  //  Makeing text (JSX element) to show
  const textDivs = member.messages.map((text, idx) => {
    const textEditing = (editing &&
      (text.pid === participants.localId || !participants.remote.has(text.pid)))

    let textToShow:JSX.Element[] = []
    if (!textEditing){ textToShow = textToLinkedText(text.message) }

    return <TextDiv {...props} key={idx} text={text} div={ref.current} textToShow={textToShow}
      member={member} textEditing={textEditing} autoFocus = {text === focusToEdit} />
  })
  const INTERVAL = 200
  const handleScroll = _.debounce((ev:React.UIEvent<HTMLDivElement, UIEvent>) => {
    if (ref.current){
      if (member.abortScroll) {
        member.abortScroll = false
      }else{
        //	console.log('sendScroll')
        onUpdateTexts(member.messages, ref.current, props)
      }
    }
  }, INTERVAL)
  member.editing = editing

  return  <div ref={ref} className = {editing ? classes.textEdit : classes.text}
    onWheel = {ev => ev.ctrlKey || ev.stopPropagation() }
    onScroll = {(ev) => { if (!editing) {  handleScroll(ev) } }}
    >
    {textDivs}
  </div>
}
