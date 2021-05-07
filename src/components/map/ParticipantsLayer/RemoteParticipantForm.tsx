import {useStore} from '@hooks/ParticipantsStore'
import Box from '@material-ui/core/Box'
import Button from '@material-ui/core/Button'
import DialogContent from '@material-ui/core/DialogContent'
import DialogTitle from '@material-ui/core/DialogTitle'
import Popover, { PopoverProps } from '@material-ui/core/Popover'
import TextField from '@material-ui/core/TextField'
import {uploadToGyazo} from '@models/api/Gyazo'
import {useTranslation} from '@models/locales'
import {isDarkColor, rgb2Color} from '@models/utils'
import {isSmartphone} from '@models/utils/utils'
import participants from '@stores/participants/Participants'
import { RemoteParticipant } from '@stores/participants/RemoteParticipant'
import {Observer} from 'mobx-react-lite'
import React, {useState} from 'react'
import {SketchPicker} from 'react-color'

export interface RemoteParticipantFormProps extends PopoverProps{
  close: () => void,
  participant: RemoteParticipant
}

const tfIStyle = {fontSize: isSmartphone() ? '2em' : '1em',
height: isSmartphone() ? '2em' : '1.5em'}
const tfDivStyle = {height: isSmartphone() ? '4em' : '3em'}
const tfLStyle = {fontSize: isSmartphone() ? '1em' : '1em'}
const iStyle = {fontSize: isSmartphone() ? '2.5rem' : '1rem'}

export const RemoteParticipantForm: React.FC<RemoteParticipantFormProps> = (props: RemoteParticipantFormProps) => {
  const {t} = useTranslation()

  function closeConfig(ev:Object, reason:string) {
    if (reason === 'enter' || reason==='backdropClick'){
    }
    props.close()
  }

  const colorButton = React.useRef<HTMLButtonElement>(null)
  const textColorButton = React.useRef<HTMLButtonElement>(null)
  const popoverProps = Object.assign({}, props)
  delete (popoverProps as Partial<RemoteParticipantFormProps>).close

  return <Popover {...popoverProps} onClose={closeConfig}>
    <DialogContent>
      <Box mb={2}>
      <Button variant="contained"
          onClick={()=>{
            closeConfig({}, 'enter')
          }}>{t('rpCall')}</Button>
      </Box>
      <Box mb={2}>
      <Button variant="contained"
        onClick={()=>{
          closeConfig({}, 'enter')
        }}>
          {participants.directRemotes.has(props.participant.id) ?
            t('rpCutYarnPhone') : t('rpConnectYarnPhone')}</Button>
      </Box>
    </DialogContent>
  </Popover>
}
