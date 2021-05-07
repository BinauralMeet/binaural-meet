import { ImageAvatar } from '@components/avatar/ImageAvatar'
import {formatTimestamp} from '@components/utils'
import {Tooltip} from '@material-ui/core'
import IconButton from '@material-ui/core/IconButton'
import TextField from '@material-ui/core/TextField'
import SendIcon from '@material-ui/icons/Send'
import {connection} from '@models/api/ConnectionDefs'
import {useTranslation} from '@models/locales'
import {ChatMessage, ChatMessageType} from '@stores/Chat'
import {Observer} from 'mobx-react-lite'
import React from 'react'
import {Stores} from '../utils'
import {styleForList} from '../utils/styles'
import {TextLineStyle} from './LeftBar'

const colorMap: { [key in ChatMessageType]: string } = {
  text: 'black',
  call: 'red',
  log: 'gray',
}


export const ChatLine: React.FC<Stores & TextLineStyle &
{message: ChatMessage}> = (props) => {
  return <Observer>{() => {
    const timestamp = formatTimestamp(props.message.timestamp)    //  make formated timestamp for tooltip
    //  const classes = styleForList({height:props.lineHeight, fontSize:props.fontSize})

    return <Tooltip title={<>{props.message.name}<br/>{timestamp}</>} placement="right">
      <div style={{wordWrap:'break-word', marginTop:2, fontSize:props.fontSize,
          backgroundColor:'#D0D0E0'}}>
        <span style={{marginRight:'0.3em'}} onClick={()=>{
          const from = props.participants.find(props.message.pid)
          if (from) { props.map.focusOn(from) }
        }}>
          <ImageAvatar name={props.message.name} colors={props.message.colors}
            avatarSrc={props.message.avatarUrl} size={props.lineHeight} border={true}
          />
        </span>
        <span style={{color:colorMap[props.message.type]}}>
          {props.message.text}
        </span>
    </div>
   </Tooltip>
  }}</Observer>
}

export const ChatInBar: React.FC<Stores&TextLineStyle>  = (props) => {
  //  console.log('Render RawContentList')
  const {t} = useTranslation()
  const classes = styleForList({height:props.lineHeight, fontSize:props.fontSize})
  const [text, setText] = React.useState('')

  return <div className={classes.container}
    style={{height:'100%', display:'flex', flexDirection: 'column-reverse',
    overflowY:'auto', overflowX:'clip', whiteSpace: 'pre-line'}} >
    <form noValidate autoComplete="off">
      <Tooltip title={t('cmSend')} placement="right">
        <div style={{position:'relative', top:26, marginTop:-26, textAlign:'right', zIndex:1000}}>
          <IconButton size={'small'} onClick={()=>{
            connection.conference.sendChatMessage(text)
            setText('')
          }}>
            <SendIcon color="primary" />
          </IconButton>
        </div>
      </Tooltip>
      <TextField label={t('cmToAll')} multiline={true} value={text}
        style={{width:'100%'}} size={props.lineHeight > 20 ? 'medium' : 'small'}
        onFocus={()=>{props.map.keyInputUsers.add('chat')}}
        onBlur={()=>{props.map.keyInputUsers.delete('chat')}}
        onKeyPress={(ev)=>{
          //  console.log(`key = ${ev.key}`, ev)
          //  if (ev.key === 'Enter'){  }
          if (ev.key === '\n'){ //  CTRL + Enter
            connection.conference.sendChatMessage(text)
            setText('')
          }
        }}
        onChange={(ev)=>{ setText(ev.target.value) }}
      />
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

