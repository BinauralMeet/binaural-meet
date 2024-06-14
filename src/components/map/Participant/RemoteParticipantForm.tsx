import {dialogStyle, titleStyle} from '@components/utils'
import {TextField} from '@material-ui/core'
import Box from '@material-ui/core/Box'
import Button from '@material-ui/core/Button'
import DialogContent from '@material-ui/core/DialogContent'
import DialogTitle from '@material-ui/core/DialogTitle'
import Popover, { PopoverProps } from '@material-ui/core/Popover'
import {conference} from '@models/conference'
import {MessageType} from '@models/conference/DataMessageType'
import {t} from '@models/locales'
import chat from '@stores/Chat'
import participants from '@stores/participants/Participants'
import {RemoteParticipant} from '@stores/participants/RemoteParticipant'
import contents from '@stores/sharedContents/SharedContents'
import React from 'react'
import {SignalQualityButton} from './SignalQuality'
import {map, roomInfo} from '@stores/'

export interface RemoteParticipantFormProps extends PopoverProps{
  close: () => void,
  participant?: RemoteParticipant
}

export const RemoteParticipantForm: React.FC<RemoteParticipantFormProps> = (props: RemoteParticipantFormProps) => {
  const [kick, setKick] = React.useState<string>('')
  const [clear, setClear] = React.useState<string>('')
  function onKeyDownKick(ev:React.KeyboardEvent){
    if (ev.key === 'Enter' && kick === 'kick') {
      if (!props.participant) { return }
      //TODO: when kicked
      window.setTimeout(()=>{conference.dataConnection.sendMessage(
        MessageType.KICK, 'Kicked by administrator.', props.participant!.id)}, 5000)
      props.close()
    }
  }
  function onKeyDownClear(ev:React.KeyboardEvent){
    if (ev.key === 'Enter' && clear === 'clear') {
      if (!props.participant) { return }
      const remoteContents:string[] = []
      contents.all.forEach(c => {
        if (c.ownerName === props.participant?.information.name) remoteContents.push(c.id)
      })
      remoteContents.forEach(cid => contents.removeByLocal(cid))

      props.close()
    }
  }
  function closeConfig(ev:Object, reason:string) {
    if (reason === 'enter' || reason==='backdropClick'){
    }
    props.close()
  }

  const popoverProps = Object.assign({}, props)
  delete (popoverProps as Partial<RemoteParticipantFormProps>).close
  const pid = props.participant ? props.participant.id : ''

  return <Popover {...popoverProps} style={dialogStyle} onClose={closeConfig}>
    <DialogTitle>
      <span style={titleStyle}>
        {props.participant?.information.name}
      </span>
      <span style={{float:'right'}}>
        <SignalQualityButton open={props.open} transport={conference.remotePeers.get(pid)?.transport} /></span>
    </DialogTitle>
    <DialogContent>
      <Box mb={2}>
      <Button variant="contained" style={{textTransform:'none'}}
          onClick={()=>{
            closeConfig({}, 'enter')
            props.participant?.call()
          }}>{t('rsCall')}</Button>
      </Box>
      <Box mb={2}>
      <Button variant="contained" style={{textTransform:'none'}}
        onClick={()=>{
          if (!props.participant) { return }
          if (participants.yarnPhones.has(props.participant.id)){
            participants.yarnPhones.delete(props.participant.id)
          }else{
            participants.yarnPhones.add(props.participant.id)
          }
          closeConfig({}, 'enter')
        }}>
          {props.participant && participants.yarnPhones.has(props.participant.id) ?
            t('rsCutYarnPhone') : t('rsConnectYarnPhone')}</Button>
      </Box>
      <Box mb={2}>
      <Button variant="contained" style={{textTransform:'none'}}
        onClick={()=>{
          if (!props.participant) { return }
          chat.sendTo = props.participant.id
          closeConfig({}, 'enter')
        }}>
          {t('rsChatTo', {name: props.participant?.information.name})}</Button>
      </Box>
      <Box mb={2}>
      <Button variant="contained" style={{textTransform:'none'}}
      onClick={()=>{
        if (!props.participant) { return }
        map.focusOn(props.participant)
      }}>{t('ctFocus')}</Button>
      </Box>
      { roomInfo.isAdmin && <>
          <Box mb={2}>
            To kick this user type 'kick' and enter. &thinsp;
            <TextField label="kick" type="text" style={{marginTop:-22}}
              value={kick} onChange={(ev)=>{setKick(ev.currentTarget.value)}} onKeyDown={onKeyDownKick}
            />
          </Box>
          <Box mb={2}>
            Clear this user's contents.&thinsp;
            <TextField label="clear" type="text" style={{marginTop:-22}}
              value={clear} onChange={(ev)=>{setClear(ev.currentTarget.value)}} onKeyDown={onKeyDownClear}
            />
         </Box>
        </>
      }
    </DialogContent>
  </Popover>
}
