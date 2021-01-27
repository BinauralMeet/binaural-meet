import {useStore as useParticipants} from '@hooks/ParticipantsStore'
import Box from '@material-ui/core/Box'
import Button from '@material-ui/core/Button'
import DialogContent from '@material-ui/core/DialogContent'
import TextField from '@material-ui/core/TextField'
import {urlParameters} from '@models/url'
import errorInfo from '@stores/ErrorInfo'
import React, {useEffect, useRef, useState} from 'react'
export const TheEntrance: React.FC<{}> = (props) => {
  const participants = useParticipants()
  const [name, setName] = useState(participants.local.information.name)
  const savedRoom = sessionStorage.getItem('room')
  const [room, setRoom] = useState(urlParameters.room ? urlParameters.room : savedRoom ? savedRoom : '')
  const button = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    button.current?.focus()
  },        [])

  const onClose = (save: boolean) => {
    if (save) {
      participants.local.information.name = name
      urlParameters.room = room
      sessionStorage.setItem('room', room)
    }
    errorInfo.clear()
  }
  const onKeyPress = (ev:React.KeyboardEvent) => {
    if (ev.key === 'Enter') {
      onClose(true)
    }else if (ev.key === 'Esc' || ev.key === 'Escape') {
      onClose(false)
    }
  }

  return <DialogContent>
    <TextField label={'Your name'} multiline={false} value={name}
    onChange={event => setName(event.target.value)} onKeyPress={onKeyPress}
    fullWidth={true} inputProps={{autoFocus:true}}
    />
    <Box mt={4}>
      <TextField label={'Venue to enter'} multiline={false} value={room}
      onChange={event => setRoom(event.target.value)} onKeyPress={onKeyPress}
      fullWidth={true} inputProps={{autoFocus:true}}
      />
    </Box>
    <Box mt={4}>
      <Button ref={button} variant="contained" color="primary" onClick={() => onClose(true)}>
        Enter the venue
      </Button>
    </Box>
  </DialogContent>
}
TheEntrance.displayName = 'TheEntrance'
