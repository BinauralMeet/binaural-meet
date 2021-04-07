import {useStore as useParticipants} from '@hooks/ParticipantsStore'
import {useStore as useContents} from '@hooks/SharedContentsStore'
import {Tooltip} from '@material-ui/core'
import {makeStyles} from '@material-ui/core/styles'
import {compTextMessage, TextMessages} from '@models/SharedContent'
import {assert} from '@models/utils'
import {getRandomColorRGB, rgba} from '@stores/utils'
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
  const memberRef = React.useRef<TextMember>(new TextMember)
  const member = memberRef.current
  const participants = useParticipants()
  const contents = useContents()
  const ref = useRef<HTMLDivElement>(null)
  const newTexts = JSON.parse(url) as TextMessages
  useEffect(() => {
    if (!props.editing) {
      ref.current?.scroll(newTexts.scroll[0], newTexts.scroll[1])
    }
  },        [newTexts.scroll])
  const indices = new Set<number>()
  const length = member.text.messages.length
  newTexts.messages.forEach((newMessage) => {
    const index = member.text.messages.findIndex(msg => msg.pid === newMessage.pid && msg.time === newMessage.time)
    if (index === -1) {
      member.text.messages.push(newMessage)
    }else {
      indices.add(index)
//      if (newMessage.pid !== participants.localId) {
      member.text.messages[index] = newMessage
//      }else {
//        assert(member.text.messages[index].message === newMessage.message)
        //  Changed by myself -> ignore the update.
        //  console.error('Some one try to change my message.')
//      }
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
        name:participants.local.information.name, time:Date.now()})
    }
  }

  const refEdit = useRef<HTMLDivElement>(null)
  member.text.messages.reverse()
  const textToEdit = member.text.messages.find(message => message.pid === participants.localId)
  member.text.messages.reverse()
  const textElems = member.text.messages.map((text, idx) => {
    const rgb = getRandomColorRGB(text.name)
    const textColor = rgb[0] / 17 + rgb[1] / 17 + rgb[2] / 17 * 0.2 > 20 ? [0, 0, 0] : [255, 255, 255]
    const textEditable = (props.editing && (text.pid === participants.localId || !participants.remote.has(text.pid)))
    const css = {
      color:rgba(textColor, 1),
      backgroundColor:rgba(rgb, 0.5),
      padding:'0.1em',
    }

    //  add link to URL strings
    const urlRegExp = /https?:\/\/[-_.!~*\'()a-zA-Z0-9;\/?:\@&=+\$,%#]+/
    const textToShow:JSX.Element[] = []
    let regResult:RegExpExecArray | null
    let start = 0
    while (regResult = urlRegExp.exec(text.message.slice(start))) {
      const before = text.message.slice(start, start + regResult.index)
      if (before) {
        textToShow.push(<span key={start}>{before}</span>)
      }
      textToShow.push(<a key={start + before.length} href={regResult[0]} target="_blank">{regResult[0]}</a>)
      start += before.length + regResult[0].length
    }
    textToShow.push(<span key={start}>{text.message.slice(start)}</span>)

    //  make timestamp for tooltip
    const textDate = new Date(text.time)
    const now = new Date()
    const year = now.getFullYear() !== textDate.getFullYear() ? textDate.getFullYear() : undefined
    const month = year || now.getMonth() !== textDate.getMonth() ? textDate.getMonth() + 1 : undefined
    const date = (year || month || now.getDate() !== textDate.getDate()) ? textDate.getDate() : undefined
    const time = `${textDate.getHours()}:${textDate.getMinutes()}:${textDate.getSeconds()}`
    const timestamp = `${year ? `${year}.` : ''}${month ? `${month}.` : ''}${date ? `${date} ` : ''}${time}`

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
/*    const newTexts:TextMessages = {
      messages: member.text.messages,
      scroll:[ref.current ? ref.current.scrollLeft : 0, ref.current ? ref.current.scrollTop : 0],
    }*/
    if (ref.current) {
      member.text.scroll = [ref.current.scrollLeft, ref.current.scrollTop]
    }
    onUpdateTexts(Object.assign({}, member.text))
  },                              INTERVAL)

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
