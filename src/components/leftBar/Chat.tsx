import { ImageAvatar } from '@components/avatar/ImageAvatar'
import {formatTimestamp} from '@components/utils'
import {Tooltip} from '@material-ui/core'
import IconButton from '@material-ui/core/IconButton'
import TextField from '@material-ui/core/TextField'
import SendIcon from '@material-ui/icons/Send'
import {MessageType} from '@models/api/ConferenceSync'
import {connection} from '@models/api/ConnectionDefs'
import {t} from '@models/locales'
import chat, {ChatMessage, ChatMessageToSend, ChatMessageType} from '@stores/Chat'
import {Observer} from 'mobx-react-lite'
import React from 'react'
import {Stores} from '../utils'
import {styleForList} from '../utils/styles'
import {TextLineStyle} from './LeftBar'

const colorMap: { [key in ChatMessageType]: string } = {
  text: 'black',
  called: 'red',
  callTo: 'black',
  log: 'black',
  private: 'purple',
}


export const ChatLine: React.FC<Stores & TextLineStyle &{message: ChatMessage}> = (props) => {
  const scale = props.message.type === 'log' || props.message.type === 'callTo' ? 0.6 : 1
  const lineHeight = props.lineHeight * scale
  const fontSize = props.fontSize * scale

  return <Observer>{() => {
    const timestamp = formatTimestamp(props.message.timestamp)    //  make formated timestamp for tooltip

    return <Tooltip title={
      props.message.type==='private' ?
      <>{t(props.message.pid===props.participants.localId ? 'cmPrivateTo' : 'cmPrivateFrom',
        {name:props.message.name})}<br/>{timestamp}</>
        : <>{props.message.name}<br/>{timestamp}</>
      } placement="right">
      <div style={{wordWrap:'break-word', marginTop:2, fontSize, backgroundColor:'#D0D0E0'}}>
        <span style={{marginRight:'0.3em'}} onClick={()=>{
          const from = props.participants.find(props.message.pid)
          if (from) { props.map.focusOn(from) }
        }}>
          <ImageAvatar name={props.message.name} colors={props.message.colors}
            avatarSrc={props.message.avatarUrl} size={lineHeight} border={true}
          />
        </span>
        <span style={{color:colorMap[props.message.type]}}>
          {props.message.text}
        </span>
    </div>
   </Tooltip>
  }}</Observer>
}

function sendMessage(text: string, sendTo: string, props: Stores){
  const msg:ChatMessageToSend = {msg:text, ts: Date.now(), to: sendTo}
  connection.conference.sendMessage(MessageType.CHAT_MESSAGE, sendTo, msg)
  if (sendTo) {
    const local = props.participants.local
    const remote = props.participants.remote.get(sendTo)
    if (remote){
      chat.addMessage(new ChatMessage(text, local.id, remote.information.name,
        local.information.avatarSrc, local.getColor(), Date.now(), 'private'))
    }
  }
}

export const ChatInBar: React.FC<Stores&TextLineStyle>  = (props) => {
  //  console.log('Render RawContentList')
  const classes = styleForList({height:props.lineHeight, fontSize:props.fontSize})
  const [text, setText] = React.useState('')

  return <div className={classes.container}
    style={{height:'100%', display:'flex', flexDirection: 'column-reverse',
    overflowY:'auto', overflowX:'clip', whiteSpace: 'pre-line'}} >
    <form noValidate autoComplete="off">
      <Tooltip title={t('cmSend')} placement="right">
        <div style={{position:'relative', top:26, marginTop:-26, textAlign:'right', zIndex:1000}}>
          <IconButton size={'small'} onClick={()=>{
            const nameTo = props.chat.sendTo ?
              props.participants?.find(props.chat.sendTo)?.information?.name : undefined
            sendMessage(text, nameTo ? props.chat.sendTo : '', props)
            setText('')
          }}>
            <SendIcon color="primary" />
          </IconButton>
        </div>
      </Tooltip>
      <Observer>{()=>{
        const nameTo = props.chat.sendTo ? props.participants?.find(props.chat.sendTo)?.information?.name : undefined

        return <TextField label={nameTo ? t('cmToName', {name: nameTo}) : t('cmToAll')} multiline={true} value={text}
          style={{width:'100%'}} size={props.lineHeight > 20 ? 'medium' : 'small'}
          onFocus={()=>{props.map.keyInputUsers.add('chat')}}
          onBlur={()=>{props.map.keyInputUsers.delete('chat')}}
          onKeyDown={(ev)=>{
            //  console.log(`key = ${ev.key}`, ev)
            if (ev.key === 'Escape' || ev.key === 'Esc'){ //  Esc key
              props.chat.sendTo = ''
            }
          }}
          onKeyPress={(ev)=>{
            //  if (ev.key === 'Enter'){  }
            if (ev.key === '\n'){ //  CTRL + Enter
              sendMessage(text, nameTo ? props.chat.sendTo : '', props)
              setText('')
            }
          }}
          onChange={(ev)=>{ setText(ev.target.value) }}
        />
      }}</Observer>
    </form>
    <div>{  /* for indent: style={{marginLeft: '0.5em', textIndent: '-0.5em'}} */}
      <Observer>{()=><>{
        props.chat.messages.map((m, idx) =>
          <ChatLine key={idx} message={m} {...props} /> )
        }</>}</Observer>
    </div>
  </div>
}
ChatInBar.displayName = 'Chat'

