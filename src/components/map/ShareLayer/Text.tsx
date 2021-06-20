import {formatTimestamp} from '@components/utils'
import {useStore as useParticipants} from '@hooks/ParticipantsStore'
import {Tooltip} from '@material-ui/core'
import {makeStyles} from '@material-ui/core/styles'
import {CSSProperties} from '@material-ui/styles'
import settings from '@models/api/Settings'
import {compTextMessage, TextMessage, TextMessages} from '@models/SharedContent'
import {assert, findTextColorRGB, isSelfUrl} from '@models/utils'
import {getRandomColorRGB, rgba} from '@models/utils'
import _ from 'lodash'
import {Observer, useObserver} from 'mobx-react-lite'
import React, {useEffect, useRef} from 'react'
import {ContentProps} from './Content'

class TextMember{
  text: TextMessages = {messages:[], scroll:[0, 0]}
  isStatic = false
}

interface TextDivProps extends ContentProps{
  text: TextMessage
  textEditing: boolean
  textToShow: JSX.Element[]
  member: TextMember
}
interface TextEditProps extends TextDivProps{
  css: React.CSSProperties
}

//  Update (send) the content if needed
function onUpdateTexts(newTexts: TextMessages, props: ContentProps) {
  const newUrl = JSON.stringify(newTexts)
  if (props.content.url !== newUrl && props.updateAndSend) {
    props.content.url = newUrl
    props.updateAndSend(props.content)
  }
}


export const TextEdit: React.FC<TextEditProps> = (props:TextEditProps) => {
  const [text, setText] = React.useState(props.text.message)

  return <Observer>{() =>
  <div style={{...props.css, position:'relative', margin:0, border:0, padding:0}}>
    <div style={{...props.css, color:'red', position:'relative', width:'100%',
      overflow: 'hidden', visibility:'hidden'}}>{text+'\u200b'}</div>
    <textarea value={text}
      style={{...props.css, font: 'inherit', verticalAlign:'baseline', resize:'none',
      position:'absolute', top:0, left:0, width:'100%', height:'100%', border:'none',
      letterSpacing: 'inherit', overflow: 'hidden'
    }}
      onChange={(ev) => {
        setText(ev.currentTarget.value)
      }}
      onBlur={() => {
        props.text.message = text
        props.member.text.messages = props.member.text.messages.filter(text => text.message.length)
        onUpdateTexts(props.member.text, props)
    }}
      onKeyDown={(ev) => {
        if (ev.key === 'Escape' || ev.key === 'Esc') {
          ev.stopPropagation()
          ev.preventDefault()
          props.text.message = text
          props.contents.setEditing('')
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

  return <Tooltip title={<React.Fragment>{props.text.name} <br /> {timestamp}</React.Fragment>}
  placement="left" arrow={true} suppressContentEditableWarning={true}><div>
  {props.textEditing ? <TextEdit {...props} css={css} /> :
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

function makeLink(key:number, regResult: string[]){
  //console.log('reg:', regResult)
  let href='', target='', disp=''
  if (regResult[1]) { disp=href=regResult[1]; target='_blank' }
  else if (regResult[2]) {
    href = regResult[2]
    disp = regResult[6] ? regResult[6] : regResult[2]
    target = regResult[3] ? '_self' : '_blank'
  }
  else {
    disp = regResult[7]
    href = regResult[11]
    target = (regResult[9]||regResult[10]) ? '_self' : '_blank'
  }
  if (isSelfUrl(new URL(href))){
    target = '_self'
  }

  return <a key={key} href={href} target={target} rel="noreferrer">{disp}</a>
}

const useStyles = makeStyles({
  text: {
    overflow: 'auto',
    height: '100%',
    width: '100%',
    whiteSpace: 'pre-line',
    pointerEvents: 'auto',
    overflowY: 'auto',
    overflowX: 'visible',
    wordWrap: 'break-word',
  },
  textEdit: {
//    border: '2px yellow solid',
    height: '100%',
    width: '100%',
    whiteSpace: 'pre-line',
    cursor: 'default',
    pointerEvents: 'auto',
    userSelect: 'text',
    overflowY: 'auto',
    overflowX: 'visible',
    wordWrap: 'break-word',
  },
})

export const Text: React.FC<ContentProps> = (props:ContentProps) => {
  assert(props.content.type === 'text')
  const classes = useStyles()
  const url = useObserver(() => props.content.url)
  const memberRef = React.useRef<TextMember>(new TextMember())
  const member = memberRef.current
  const participants = useParticipants()
  const ref = useRef<HTMLDivElement>(null)
  const newTexts = JSON.parse(url) as TextMessages
  const refEdit = useRef<HTMLDivElement>(null)
  const editing = useObserver(() => props.contents.editing === props.content.id)
  if (editing){
    props.contents.setBeforeChangeEditing((cur, next) => {
      if (cur === props.content.id && next === ''){
        member.text.messages = member.text.messages.filter(text => text.message.length)
        onUpdateTexts(member.text, props)
        props.contents.setBeforeChangeEditing()
      }
    })
  }
  useEffect(() => {
    if (!editing) {
      ref.current?.scroll(newTexts.scroll[0], newTexts.scroll[1])
    }
  },        [newTexts.scroll, editing])

  //  Update remote messages
  const indices = new Set<number>()
  newTexts.messages.forEach((newMessage) => {
    const index = member.text.messages.findIndex(msg => msg.pid === newMessage.pid && msg.time === newMessage.time)
    if (index === -1) {
      indices.add(member.text.messages.length)
      member.text.messages.push(newMessage)       //  Add new messages
    }else if (newMessage.pid !== props.participants.localId){
      indices.add(index)
      member.text.messages[index] = newMessage  //  Update remote messages
    }
  })
  //  remove removed messages
  member.text.messages = member.text.messages.filter((msg, idx) =>
    msg.pid === props.participants.localId || indices.has(idx))
  member.text.messages.sort(compTextMessage)

  if (editing) {
    //  Make a new message to edit if needed.
    const last = member.text.messages.pop()
    if (last) {
      member.text.messages.push(last)
    }
    if (last?.pid !== participants.localId) {
      member.text.messages.push({message:'', pid:participants.localId,
        name:participants.local.information.name,
        color: participants.local.information.color,
        textColor: participants.local.information.textColor,
        time:Date.now()})
    }
  }

/*  //  Find the message to edit, my last message.
  member.text.messages.reverse()
  const textToEdit = member.text.messages.find(message => message.pid === participants.localId)
  member.text.messages.reverse()  */
  //  Makeing JSX element to show
  const textElems = member.text.messages.map((text, idx) => {
    const textEditable = (editing && (text.pid === participants.localId || !participants.remote.has(text.pid)))

    //  add link to URL strings
    const urlReg = 'https?:\\/\\/[-_.!~*\'()a-zA-Z0-9;/?:@&=+$,%#]+'
    const urlRegExp = new RegExp(`(${urlReg})|` +
      `\\[(${urlReg})(( *>)|( +move))?\\s*(\\S+)\\]` +
      `|\\[(\\S+)((\\s*>)|(\\s+move)|\\s)\\s*(${urlReg})\\]`)
    const textToShow:JSX.Element[] = []
    let regResult:RegExpExecArray | null
    let start = 0
    while ((regResult = urlRegExp.exec(text.message.slice(start))) !== null) {
      const before = text.message.slice(start, start + regResult.index)
      if (before) {
        textToShow.push(<span key={start}>{before}</span>)
      }
      textToShow.push(makeLink(start + before.length, regResult))
      start += before.length + regResult[0].length
    }
    textToShow.push(<span key={start}>{text.message.slice(start)}</span>)

    return <TextDiv {...props} key={idx} text={text} textToShow={textToShow} member={member}
      textEditing={textEditable && editing} />
  })
  useEffect(() => {
    if (editing && refEdit.current) {
      const children = refEdit.current?.parentElement?.children
      if (document.activeElement) {
        for (let i = 0; i < (children ? children.length : 0); i += 1) {
          if (children?.item(i) === document.activeElement) {
            return
          }
        }
      }
      refEdit.current.focus()
    }
  })

  const INTERVAL = 200
  const handleScroll = _.debounce((ev:React.UIEvent<HTMLDivElement, UIEvent>) => {
    if (ref.current) {
      member.text.scroll = [ref.current.scrollLeft, ref.current.scrollTop]
      onUpdateTexts(member.text, props)
    }
  }, INTERVAL)

  return  <div ref={ref} className = {editing ? classes.textEdit : classes.text}
    onWheel = {ev => ev.ctrlKey || ev.stopPropagation() }
    onScroll = {(ev) => { if (!editing) {  handleScroll(ev) } }}
    >
    {textElems}
  </div>
}
