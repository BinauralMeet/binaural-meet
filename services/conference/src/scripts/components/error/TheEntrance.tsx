import {useStore as useParticipants} from '@hooks/ParticipantsStore'
import usageEn from '@images/usage.en.png'
import usageJa from '@images/usage.ja.png'
import Box from '@material-ui/core/Box'
import Button from '@material-ui/core/Button'
import DialogContent from '@material-ui/core/DialogContent'
import TextField from '@material-ui/core/TextField'
import TranslateIcon from '@material-ui/icons/Translate'
import {i18nSupportedLngs, useTranslation} from '@models/locales'
import {urlParameters} from '@models/url'
import {isSmartphone} from '@models/utils'
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

  const {t, i18n} = useTranslation()

  const tfIStyle = {fontSize: isSmartphone() ? '2em' : '1em',
    height: isSmartphone() ? '2em' : '1.5em'}
  const tfLStyle = {fontSize: isSmartphone() ? '1em' : '1em'}
  const tfDivStyle = {height: isSmartphone() ? '4em' : '3em'}

  return <DialogContent style={{fontSize: isSmartphone() ? '2em' : '1em'}}>
    <Button style={{position:'absolute', top:30, right:20}} onClick = {() => {
      const idx = (i18nSupportedLngs.findIndex(l => l === i18n.language) + 1) % i18nSupportedLngs.length
      i18n.changeLanguage(i18nSupportedLngs[idx])
    }}>
      <TranslateIcon />
    </Button>
    <h2>Binaural Meet</h2>
    <p>
      <img style={{float: 'right', width:'28em'}} src={i18n.language === 'ja' ? usageJa : usageEn} />
      {t('aboutBM')}&nbsp;
    <a href="https://scrapbox.io/binaural-meet/Top_page">{t('BMmoreInfo')}</a>
    </p>
    <br />
    <TextField label={t('YourName')} multiline={false} value={name} style={tfDivStyle}
      inputProps={{style: tfIStyle, autoFocus:true}} InputLabelProps={{style: tfLStyle}}
      onChange={event => setName(event.target.value)} onKeyPress={onKeyPress} fullWidth={true}
    />
    <Box mt={4}>
      <TextField label={t('Venue')} multiline={false} value={room} style={tfDivStyle}
      inputProps={{style: tfIStyle, autoFocus:true}} InputLabelProps={{style: tfLStyle}}
      onChange={event => setRoom(event.target.value)} onKeyPress={onKeyPress} fullWidth={true}
      />
    </Box>
    <Box mt={4}>
      <Button ref={button} variant="contained" color="primary" onClick={() => onClose(true)}
        style={{fontSize:isSmartphone() ? '1.25em' : '1em'}}>
        {t('EnterTheVenue')}
      </Button>
    </Box>
  </DialogContent>
}
TheEntrance.displayName = 'TheEntrance'
