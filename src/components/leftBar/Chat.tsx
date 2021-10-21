import { ImageAvatar } from '@components/avatar/ImageAvatar'
import {formatTimestamp} from '@components/utils'
import { textToLinkedText } from '@components/utils/Text'
import {Tooltip} from '@material-ui/core'
import IconButton from '@material-ui/core/IconButton'
import TextField from '@material-ui/core/TextField'
import SendIcon from '@material-ui/icons/Send'
import {connection} from '@models/api/ConnectionDefs'
import {MessageType} from '@models/api/MessageType'
import {t} from '@models/locales'
import {isDarkColor} from '@models/utils'
import chat, {ChatMessage, ChatMessageToSend, ChatMessageType} from '@stores/Chat'
import {Observer} from 'mobx-react-lite'
import React from 'react'
import {BMProps} from '../utils'
import {styleForList} from '../utils/styles'
import {TextLineStyle} from './LeftBar'

const colorMapBlack: { [key in ChatMessageType]: string } = {
  text: 'black',
  called: 'red',
  callTo: 'black',
  log: 'black',
  private: 'purple',
}
const colorMapWhite: { [key in ChatMessageType]: string } = {
  text: 'white',
  called: 'red',
  callTo: 'white',
  log: 'white',
  private: 'purple',
}


export const ChatLine: React.FC<BMProps & TextLineStyle &{message: ChatMessage}> = (props) => {
  const scale = props.message.type === 'log' || props.message.type === 'callTo' ? 0.6 : 1
  const lineHeight = props.lineHeight * scale
  const fontSize = props.fontSize * scale
  const {roomInfo, participants, map} = props.stores

  return <Observer>{() => {
    const timestamp = formatTimestamp(props.message.timestamp)    //  make formated timestamp for tooltip
    const colorMap = isDarkColor(roomInfo.backgroundFill) ? colorMapWhite : colorMapBlack
    const backColor = isDarkColor(roomInfo.backgroundFill) ? 'rgba(0, 0, 0, 0.3)' : 'rgba(255, 255, 255, 0.3)'

    return <Tooltip title={
      props.message.type==='private' ?
      <>{t(props.message.pid===participants.localId ? 'cmPrivateTo' : 'cmPrivateFrom',
        {name:props.message.name})}<br/>{timestamp}</>
        : <>{props.message.name}<br/>{timestamp}</>
      } placement="right">
      <div style={{display:'flex', wordWrap:'break-word', marginTop:2, fontSize, backgroundColor:backColor}}>
        <span style={{marginRight:'0.3em'}} onClick={()=>{
          const from = participants.find(props.message.pid)
          if (from) { map.focusOn(from) }
        }}>
          <ImageAvatar name={props.message.name} colors={props.message.colors}
            avatarSrc={props.message.avatarUrl} size={lineHeight} border={true}
          />
        </span>
        <span style={{color:colorMap[props.message.type]}}>
          {textToLinkedText(props.message.text)}
        </span>
    </div>
   </Tooltip>
  }}</Observer>
}

function sendChatMessage(text: string, sendTo: string, props: BMProps){
  const msg:ChatMessageToSend = {msg:text, ts: Date.now(), to: sendTo}
  connection.conference.sendMessage(MessageType.CHAT_MESSAGE, msg, sendTo)
  const local = props.stores.participants.local
  if (sendTo) {
    const remote = props.stores.participants.remote.get(sendTo)
    if (remote){
      chat.addMessage(new ChatMessage(text, local.id, remote.information.name,
        local.information.avatarSrc, local.getColor(), Date.now(), 'private'))
    }
  }else{
    chat.addMessage(new ChatMessage(text, local.id, local.information.name,
      local.information.avatarSrc, local.getColor(), Date.now(), 'text'))
  }
}

export const ChatInBar: React.FC<BMProps&TextLineStyle>  = (props) => {
  //  console.log('Render RawContentList')
  const {chat, roomInfo, participants, map} = props.stores
  const classes = styleForList({height:props.lineHeight, fontSize:props.fontSize})
  const [text, setText] = React.useState('')

  return <div className={classes.container}
    style={{height:'100%', display:'flex', flexDirection: 'column-reverse',
    overflowY:'auto', overflowX:'clip', whiteSpace: 'pre-line'}} >
    <form noValidate autoComplete="off">
      <Tooltip title={t('cmSend')} placement="right">
        <div style={{position:'relative', top:26, marginTop:-26, textAlign:'right', zIndex:1000}}>
          <IconButton size={'small'} onClick={()=>{
            const nameTo = chat.sendTo ?
              participants?.find(chat.sendTo)?.information?.name : undefined
            sendChatMessage(text, nameTo ? chat.sendTo : '', props)
            setText('')
          }}>
            <SendIcon color="primary" />
          </IconButton>
        </div>
      </Tooltip>
      <Observer>{()=>{
        const nameTo = chat.sendTo ? participants?.find(chat.sendTo)?.information?.name : undefined
        const textColor = isDarkColor(roomInfo.backgroundFill) ? 'white' : 'black'

        return <TextField label={nameTo ? t('cmToName', {name: nameTo}) : t('cmToAll')} multiline={true} value={text}
          style={{width:'100%', userSelect:'none'}} size={props.lineHeight > 20 ? 'medium' : 'small'}
          InputProps={{style:{color:textColor}}}
          InputLabelProps={{style:{color:textColor}}}
          onFocus={()=>{map.keyInputUsers.add('chat')}}
          onBlur={()=>{map.keyInputUsers.delete('chat')}}
          onKeyDown={(ev)=>{
            //  console.log(`key = ${ev.key}`, ev)
            if (ev.key === 'Escape' || ev.key === 'Esc'){ //  Esc key
              chat.sendTo = ''
            }
          }}
          onKeyPress={(ev)=>{
            //  if (ev.key === 'Enter'){  }
            if (ev.key === '\n'){ //  CTRL + Enter
              sendChatMessage(text, nameTo ? chat.sendTo : '', props)
              setText('')
            }
          }}
          onChange={(ev)=>{ setText(ev.target.value) }}
        />
      }}</Observer>
    </form>
    <div>{  /* for indent: style={{marginLeft: '0.5em', textIndent: '-0.5em'}} */}
      <Observer>{()=><>{
        chat.messages.map((m, idx) =>
          <ChatLine key={idx} message={m} {...props} /> )
        }</>}</Observer>
    </div>
  </div>
}
ChatInBar.displayName = 'Chat'

