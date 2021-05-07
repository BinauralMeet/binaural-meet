import Box from '@material-ui/core/Box'
import Button from '@material-ui/core/Button'
import DialogContent from '@material-ui/core/DialogContent'
import Popover, { PopoverProps } from '@material-ui/core/Popover'
import {useTranslation} from '@models/locales'
import participants from '@stores/participants/Participants'
import {RemoteParticipant} from '@stores/participants/RemoteParticipant'
import React from 'react'

export interface RemoteParticipantFormProps extends PopoverProps{
  close: () => void,
  participant: RemoteParticipant
}

export const RemoteParticipantForm: React.FC<RemoteParticipantFormProps> = (props: RemoteParticipantFormProps) => {
  const {t} = useTranslation()

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
      <Button variant="contained"
          onClick={()=>{
            closeConfig({}, 'enter')
            props.participant.call()
          }}>{t('rpCall')}</Button>
      </Box>
      <Box mb={2}>
      <Button variant="contained"
        onClick={()=>{
          if (participants.directRemotes.has(props.participant.id)){
            participants.directRemotes.delete(props.participant.id)
          }else{
            participants.directRemotes.add(props.participant.id)
          }
          closeConfig({}, 'enter')
        }}>
          {participants.directRemotes.has(props.participant.id) ?
            t('rpCutYarnPhone') : t('rpConnectYarnPhone')}</Button>
      </Box>
    </DialogContent>
  </Popover>
}
