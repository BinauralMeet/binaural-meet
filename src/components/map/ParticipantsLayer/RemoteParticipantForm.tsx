import { TextField } from '@material-ui/core'
import Box from '@material-ui/core/Box'
import Button from '@material-ui/core/Button'
import DialogContent from '@material-ui/core/DialogContent'
import DialogTitle from '@material-ui/core/DialogTitle'
import Popover, { PopoverProps } from '@material-ui/core/Popover'
import {connection} from '@models/api'
import {t} from '@models/locales'
import chat from '@stores/Chat'
import {MapData} from '@stores/Map'
import participants from '@stores/participants/Participants'
import {RemoteParticipant} from '@stores/participants/RemoteParticipant'
import roomInfo from '@stores/RoomInfo'
import React from 'react'

export interface RemoteParticipantFormProps extends PopoverProps{
  close: () => void,
  participant: RemoteParticipant
  map: MapData
}


export const RemoteParticipantForm: React.FC<RemoteParticipantFormProps> = (props: RemoteParticipantFormProps) => {
  const [kick, setKick] = React.useState<string>('')
  function onKeyPress(ev:React.KeyboardEvent){
    if (ev.key === 'Enter' && kick === 'kick') {
      connection.conference.kickParticipant(props.participant.id)
    }
  }
  function closeConfig(ev:Object, reason:string) {
    if (reason === 'enter' || reason==='backdropClick'){
    }
    props.close()
  }

  const popoverProps = Object.assign({}, props)
  delete (popoverProps as Partial<RemoteParticipantFormProps>).close

  return <Popover {...popoverProps} onClose={closeConfig}>
    <DialogTitle>
      {props.participant.information.name}
    </DialogTitle>
    <DialogContent>
      <Box mb={2}>
      <Button variant="contained" style={{textTransform:'none'}}
          onClick={()=>{
            closeConfig({}, 'enter')
            props.participant.call()
          }}>{t('rsCall')}</Button>
      </Box>
      <Box mb={2}>
      <Button variant="contained" style={{textTransform:'none'}}
        onClick={()=>{
          if (participants.yarnPhones.has(props.participant.id)){
            participants.yarnPhones.delete(props.participant.id)
          }else{
            participants.yarnPhones.add(props.participant.id)
          }
          closeConfig({}, 'enter')
        }}>
          {participants.yarnPhones.has(props.participant.id) ?
            t('rsCutYarnPhone') : t('rsConnectYarnPhone')}</Button>
      </Box>
      <Box mb={2}>
      <Button variant="contained" style={{textTransform:'none'}}
        onClick={()=>{
          chat.sendTo = props.participant.id
          closeConfig({}, 'enter')
        }}>
          {t('rsChatTo', {name: props.participant.information.name})}</Button>
      </Box>
      <Box mb={2}>
      <Button variant="contained" style={{textTransform:'none'}}
      onClick={()=>{
        props.map.focusOn(props.participant)
      }}>{t('ctFocus')}</Button>
      </Box>
      { roomInfo.passMatched &&
        <Box mb={2}>
          To kick this user type 'kick' and enter.
          <TextField label="kick" type="text"
            value={kick} onChange={(ev)=>{setKick(ev.currentTarget.value)}} onKeyPress={onKeyPress}
          />
        </Box>
      }
    </DialogContent>
  </Popover>
}
