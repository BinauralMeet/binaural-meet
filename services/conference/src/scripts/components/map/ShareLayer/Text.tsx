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
  text: {
    overflow: 'auto',
    height: '100%',
    width: '100%',
    whiteSpace: 'pre-line',
    pointerEvents: 'auto',
  },
  textEdit: {
    overflow: 'auto',
    border: '2px yellow solid',
    height: '100%',
    width: '100%',
    whiteSpace: 'pre-line',
    cursor: 'default',
    pointerEvents: 'auto',
    userSelect: 'text',
  },
})


export const Text: React.FC<ContentProps> = (props:ContentProps) => {
  assert(props.content.type === 'text')
  const classes = useStyles()
  const url = useObserver(() => props.content.url)
  const participants = useParticipants()
  const [texts, setTexts] = useState([] as TextPhrase[])
  Object.assign(texts, JSON.parse(url))
  const ref = useRef<HTMLDivElement>(null)

  const textElems = texts.map((text, idx) => {
    const rgb = getRandomColorRGB(text.name)
    const textColor = rgb[0] / 17 + rgb[1] / 17 + rgb[2] / 17 * 0.2 > 20 ? [0, 0, 0] : [255, 255, 255]
    const textEditable = (props.editing && (text.pid === participants.localId || !participants.remote.has(text.pid)))
    const css = {color:rgba(textColor, 1), backgroundColor:rgba(rgb, 0.5), padding:'0.1em'}

    return <Tooltip key={idx} title={`${text.name}`} placement="left" suppressContentEditableWarning={true}>
      <div style={css} contentEditable = {textEditable}
        onInput={(ev) => { text.text = ev.currentTarget.innerText } }>
        {text.text}
      </div>
    </Tooltip>
  })

  return  <div ref={ref} className = {props.editing ? classes.textEdit : classes.text}
    onWheel = {ev => ev.ctrlKey || ev.stopPropagation() }
    onDoubleClick = {() => {
      if (!props.editing) {
        props.setEditing(true)
        const last = texts.pop()
        if (last) {
          texts.push(last)
          if (last?.pid !== participants.localId) {
            texts.push({text:'', pid:participants.localId, name:participants.local.get().information.name})
          }
        }
        setTexts(texts)
      }
    } }
    onPointerLeave = {() => {
      props.setEditing(false)
      const newTexts = texts.filter(text => text.text.length)
      props.content.url = JSON.stringify(newTexts)
      if (props.onUpdate) { props.onUpdate(Object.assign({}, props.content)) }
    } }>
    {textElems}
  </div>
}
