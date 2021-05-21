import {formatTimestamp} from '@components/utils'
import {useStore as useParticipants} from '@hooks/ParticipantsStore'
import {useStore as useContents} from '@hooks/SharedContentsStore'
import {Tooltip} from '@material-ui/core'
import {makeStyles} from '@material-ui/core/styles'
import {compTextMessage, TextMessages} from '@models/SharedContent'
import {assert, findTextColorRGB, isSelfUrl} from '@models/utils'
import {getRandomColorRGB, rgba} from '@models/utils'
import _ from 'lodash'
import {useObserver} from 'mobx-react-lite'
import React, {useEffect, useRef} from 'react'
import {ContentProps} from './Content'

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
    border: '2px yellow solid',
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

class TextMember{
  text: TextMessages = {messages:[], scroll:[0, 0]}
  isStatic = false
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


export const Text: React.FC<ContentProps> = (props:ContentProps) => {
  assert(props.content.type === 'text')
  function onUpdateTexts(newTexts: TextMessages) {
    const newUrl = JSON.stringify(newTexts)
    if (props.content.url !== newUrl && props.onUpdate) {
      props.content.url = newUrl
      props.onUpdate(Object.assign({}, props.content))
    }
  }

  const classes = useStyles()
  const url = useObserver(() => props.content.url)
  const memberRef = React.useRef<TextMember>(new TextMember())
  const member = memberRef.current
  const participants = useParticipants()
  const contents = useContents()
  const ref = useRef<HTMLDivElement>(null)
  const newTexts = JSON.parse(url) as TextMessages
  useEffect(() => {
    if (!props.editing) {
      ref.current?.scroll(newTexts.scroll[0], newTexts.scroll[1])
    }
  },        [newTexts.scroll, props.editing])
  const indices = new Set<number>()
  const length = member.text.messages.length
  newTexts.messages.forEach((newMessage) => {
    const index = member.text.messages.findIndex(msg => msg.pid === newMessage.pid && msg.time === newMessage.time)
    if (index === -1) {
      member.text.messages.push(newMessage)
    }else {
      indices.add(index)
      member.text.messages[index] = newMessage
    }
  })
  for (let i = length - 1; i >= 0; i -= 1) {
    if (!indices.has(i)) {
      member.text.messages.splice(i, 1)
    }
  }
  member.text.messages.sort(compTextMessage)

  if (props.editing) {
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

  const refEdit = useRef<HTMLDivElement>(null)
  member.text.messages.reverse()
  const textToEdit = member.text.messages.find(message => message.pid === participants.localId)
  member.text.messages.reverse()
  const textElems = member.text.messages.map((text, idx) => {
    const rgb = text.color?.length ? text.color : getRandomColorRGB(text.name)
    const textColor = text.textColor?.length ? text.textColor : findTextColorRGB(rgb)
    const textEditable = (props.editing && (text.pid === participants.localId || !participants.remote.has(text.pid)))
    const css = {
      color:rgba(textColor, 1),
      backgroundColor:rgba(rgb, 0.5),
      padding:'0.1em',
    }

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
    const timestamp = formatTimestamp(text.time)    //  make formated timestamp for tooltip

    return <Tooltip key={idx} title={<React.Fragment>{text.name} <br /> {timestamp}</React.Fragment>}
      placement="left" arrow={true} suppressContentEditableWarning={true}>
      <div style={css} contentEditable = {textEditable} ref={text === textToEdit ? refEdit : undefined}
        onInput={(ev) => {
          text.message = ev.currentTarget.innerText
        } }
        onKeyDown={(ev) => {
          if (ev.key === 'Escape' || ev.key === 'Esc') {
            member.text.messages = member.text.messages.filter(text => text.message.length)
            onUpdateTexts(member.text)
            contents.editingId = ''
          }
        }}
        onBlur={(ev) => {
          member.text.messages = member.text.messages.filter(text => text.message.length)
          onUpdateTexts(member.text)
        }}
        //  Select text by static click
        onPointerDown={()=>{ member.isStatic = true }}
        onPointerMove={()=>{ member.isStatic = false }}
        onPointerUp={(ev)=>{
          if (!member.isStatic){ return }
          const target = ev.target
          if (!textEditable && target instanceof Node){
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
                //console.log(`onDoubleClick tgt=${target} rng=${range.toString()}`, selection)
              }
            }
          }
        }}
      >
        {props.editing ? text.message : textToShow}
      </div>
    </Tooltip>
  })
  useEffect(() => {
    if (props.editing && refEdit.current) {
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
      onUpdateTexts(member.text)
    }
  }, INTERVAL)

  return  <div ref={ref} className = {props.editing ? classes.textEdit : classes.text}
    onWheel = {ev => ev.ctrlKey || ev.stopPropagation() }
    onScroll = {(ev) => { if (!props.editing) {  handleScroll(ev) } }}
    onDoubleClick = {() => { if (!props.editing) { props.setEditing(true) } }}
    onPointerLeave = {() => {
      props.setEditing(false)
      member.text.messages = member.text.messages.filter(text => text.message.length)
      onUpdateTexts(member.text)
    }}>
    {textElems}
  </div>
}
