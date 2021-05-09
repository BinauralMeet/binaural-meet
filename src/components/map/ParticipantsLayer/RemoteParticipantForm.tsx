import Box from '@material-ui/core/Box'
import Button from '@material-ui/core/Button'
import DialogContent from '@material-ui/core/DialogContent'
import Popover, { PopoverProps } from '@material-ui/core/Popover'
import {t} from '@models/locales'
import chat from '@stores/Chat'
import participants from '@stores/participants/Participants'
import {RemoteParticipant} from '@stores/participants/RemoteParticipant'
import React from 'react'

export interface RemoteParticipantFormProps extends PopoverProps{
  close: () => void,
  participant: RemoteParticipant
}

export const RemoteParticipantForm: React.FC<RemoteParticipantFormProps> = (props: RemoteParticipantFormProps) => {

  function closeConfig(ev:Object, reason:string) {
    if (reason === 'enter' || reason==='backdropClick'){
    }
    props.close()
  }

  const popoverProps = Object.assign({}, props)
  delete (popoverProps as Partial<RemoteParticipantFormProps>).close

  return <Popover {...popoverProps} onClose={closeConfig}>
    <DialogContent>
      <Box mb={2}>
      <Button variant="contained" color="primary" style={{textTransform:'none'}}
          onClick={()=>{
            closeConfig({}, 'enter')
            props.participant.call()
          }}>{t('rsCall')}</Button>
      </Box>
      <Box mb={2}>
      <Button variant="contained" color="primary" style={{textTransform:'none'}}
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
      <Button variant="contained" color="primary" style={{textTransform:'none'}}
        onClick={()=>{
          chat.sendTo = props.participant.id
          closeConfig({}, 'enter')
        }}>
          {t('rsChatTo', {name: props.participant.information.name})}</Button>
      </Box>
    </DialogContent>
  </Popover>
}
