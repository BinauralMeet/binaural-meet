import { BMProps } from '@components/utils'
import Box from '@material-ui/core/Box'
import Button from '@material-ui/core/Button'
import Checkbox from '@material-ui/core/Checkbox'
import DialogContent from '@material-ui/core/DialogContent'
import DialogTitle from '@material-ui/core/DialogTitle'
import FormControlLabel from '@material-ui/core/FormControlLabel'
import Popover, { PopoverOrigin, PopoverReference } from '@material-ui/core/Popover'
import TextField from '@material-ui/core/TextField'
import {uploadToGyazo} from '@models/api/Gyazo'
import {useTranslation} from '@models/locales'
import {isDarkColor, rgb2Color} from '@models/utils'
import {isSmartphone} from '@models/utils/utils'
import {Observer} from 'mobx-react-lite'
import React, {useState} from 'react'
import {SketchPicker} from 'react-color'
import {SignalQualityButton} from './SignalQuality'

export interface LocalParticipantFormProps extends BMProps{
  open: boolean
  anchorEl: HTMLElement | null
  anchorOrigin: PopoverOrigin
  close: () => void,
  anchorReference?: PopoverReference
}

const tfIStyle = {fontSize: isSmartphone() ? '2em' : '1em',
height: isSmartphone() ? '2em' : '1.5em'}
const tfDivStyle = {height: isSmartphone() ? '4em' : '3em'}
const tfLStyle = {fontSize: isSmartphone() ? '1em' : '1em'}
const iStyle = {fontSize: isSmartphone() ? '2.5rem' : '1rem'}

export const LocalParticipantForm: React.FC<LocalParticipantFormProps> = (props: LocalParticipantFormProps) => {
  const {participants, map} = props.stores
  const local = participants.local
  const [file, setFile] = useState<File|null>()
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [showTextColorPicker, setShowTextColorPicker] = useState(false)
  const {t} = useTranslation()

  function closeConfig(ev:Object, reason:string) {
    if (reason === 'enter' || reason==='backdropClick'){
      local.sendInformation()
      local.saveInformationToStorage(true)
    }
    props.close()
  }


  const onKeyPress = (ev:React.KeyboardEvent) => {
    if (ev.key === 'Enter') {
      closeConfig(ev, 'enter')
    }else if (ev.key === 'Esc' || ev.key === 'Escape') {
      local.loadInformationFromStorage()
    }
  }
  function clearAvatarSrc(ev: React.FormEvent) {
    ev.preventDefault()
    setFile(null)
    local.information.avatarSrc = ''
  }
  function uploadAvatarSrc(ev: React.FormEvent) {
    ev.preventDefault()
    if (file) {
      uploadToGyazo(file).then((url) => {
        local.information.avatarSrc = url
      })
    }
  }

  const colorButton = React.useRef<HTMLButtonElement>(null)
  const textColorButton = React.useRef<HTMLButtonElement>(null)
  const {close, ...popoverProps} = props

  return <Popover {...popoverProps} onClose={closeConfig}>
    <DialogTitle>
      <span  style={{fontSize: isSmartphone() ? '2.5em' : '1em'}}>
        {t('lsTitle')}
      </span>
      <span style={{float:'right'}}>
        <SignalQualityButton open={props.open} stats={local.quality} isLocal={true}/></span>
    </DialogTitle>
    <DialogContent>
      <Observer>{ ()=> {
        const rgb = local.getColorRGB()
        const textRgb = local.getTextColorRGB()
        const textColor = isDarkColor(rgb) ? 'white' : 'black'
        const backColor = isDarkColor(textRgb) ? 'lightgray' : 'gray'
        //  console.log('render color picker', rgb)

        return  <>
          <TextField label={t('YourName')} multiline={false} value={local.information.name} style={tfDivStyle}
            inputProps={{style: tfIStyle, autoFocus:true}} InputLabelProps={{style: tfLStyle}}
            onChange={event => {local.information.name = event.target.value}}
            onKeyPress={onKeyPress} fullWidth={true}
          />
          <Box mt={3}>
            <div style={{fontSize:12}}>{t('lsColor')}</div>
            <Box ml={2}>
              <Button variant="contained"
                style={{backgroundColor:rgb2Color(rgb), color:textColor, textTransform:'none'}}
                onClick={()=>{setShowColorPicker(true)}} ref={colorButton}>
                {t('lsColorAvatar')}</Button>
              <Popover open={showColorPicker} onClose={()=>{setShowColorPicker(false)}}
                anchorEl={colorButton.current} anchorOrigin={{vertical:'bottom', horizontal:'right'}}>
                <SketchPicker color = {{r:rgb[0], g:rgb[1], b:rgb[2]}} disableAlpha
                  onChange={(color, event)=>{
                    event.preventDefault()
                    local.information.color = [color.rgb.r, color.rgb.g, color.rgb.b]
                  }}
                  />
              </Popover>
              <Button variant="contained"
                style={{color:rgb2Color(textRgb), backgroundColor:backColor, marginLeft:15, textTransform:'none'}}
                onClick={()=>{setShowTextColorPicker(true)}} ref={textColorButton}>
                {t('lsColorText')}</Button>
              <Popover open={showTextColorPicker} anchorOrigin={{vertical:'bottom', horizontal:'right'}}
                onClose={()=>{setShowTextColorPicker(false)}} anchorEl={textColorButton.current}>
                <SketchPicker color = {{r:textRgb[0], g:textRgb[1], b:textRgb[2]}}
                  onChange={(color, event)=>{
                    event.preventDefault()
                    local.information.textColor = [color.rgb.r, color.rgb.g, color.rgb.b]
                  }}
                />
              </Popover>
              <Button variant="contained" style={{marginLeft:15, textTransform:'none'}}
                onClick={()=>{local.information.color=[]; local.information.textColor=[]}} >
                {t('lsAutoColor')}</Button>
            </Box>
          </Box>
          <Box mt={3}>
            <div style={{fontSize:12}}>{t('lsImage')}</div>
            <Box mt={-1} ml={2}>
              <form key="information" onSubmit = {uploadAvatarSrc}
                style={{lineHeight:'2em', fontSize: isSmartphone() ? '2.5em' : '1em'}}>
                <div style={{fontSize:12, marginTop:8}}>{t('lsImageFile')}</div>
                {local.information.avatarSrc ? <>
                  <img src={local.information.avatarSrc} style={{height:'1.5em', verticalAlign:'middle'}} alt="avatar"/>
                  <input style={iStyle} type="submit" onClick={clearAvatarSrc} value="✕" /> &nbsp;
                </> : undefined}
                <input style={iStyle} type="file" onChange={(ev) => {
                  setFile(ev.target.files?.item(0))
                }} />
                <input style={iStyle} type="submit" value="Upload" />
              </form>
              <TextField label={t('lsEmail')} multiline={false} value={local.info.email}
                style={{...tfDivStyle, marginTop:8}}
                inputProps={{style: tfIStyle, autoFocus:true}} InputLabelProps={{style: tfLStyle}}
                onChange={event => local.info.email = event.target.value}
                onKeyPress={onKeyPress} fullWidth={true}
              />
            </Box>
          </Box>
          <Box mt={3}>
            <div style={{fontSize:12}}>{t('lsNotification')}</div>
            <Box mt={-1} ml={2}>
            <FormControlLabel control={
              <Checkbox color="primary" checked={local.information.notifyCall}
              onChange={(ev)=>{local.information.notifyCall = ev.target.checked}} />
              } label={t('lsNotifyCall')} />
            <FormControlLabel control={
              <Checkbox color="primary" checked={local.information.notifyTouch}
                onChange={(ev)=>{local.information.notifyTouch = ev.target.checked}} />
              } label={t('lsNotifyTouch')} />
            <FormControlLabel control={
              <Checkbox color="primary" checked={local.information.notifyNear}
                onChange={(ev)=>{local.information.notifyNear = ev.target.checked}} />
              } label={t('lsNotifyNear')} />
            <FormControlLabel control={
              <Checkbox color="primary" checked={local.information.notifyYarn}
                onChange={(ev)=>{local.information.notifyYarn = ev.target.checked}} />
              } label={t('lsNotifyYarn')} />
            </Box>
          </Box>
        </>}}
      </Observer>
      <Box mt={4} mb={3}>
        <Button variant="contained" color="primary" style={{textTransform:'none'}}
          onClick={()=>{
            closeConfig({}, 'enter')
          }}>{t('btSave')}</Button>
        <Button variant="contained" color="secondary" style={{marginLeft:15, textTransform:'none'}}
          onClick={()=>{ local.loadInformationFromStorage()}}>{t('btCancel')}</Button>
        <Button variant="contained" style={{marginLeft:15, textTransform:'none'}}
          onClick={()=>{
            map.focusOn(local)
          }}>{t('ctFocus')}</Button>
      </Box>
    </DialogContent>
  </Popover>
}
