import {CheckWithLabel, buttonStyle, dialogStyle, inputStyle, tfDivStyle, tfIStyle, tfLStyle, titleStyle } from '@components/utils'
import Box from '@material-ui/core/Box'
import Button from '@material-ui/core/Button'
import DialogContent from '@material-ui/core/DialogContent'
import DialogTitle from '@material-ui/core/DialogTitle'
import Popover, { PopoverOrigin, PopoverReference } from '@material-ui/core/Popover'
import TextField from '@material-ui/core/TextField'
import {uploadToGyazo} from '@models/api/Gyazo'
import { conference } from '@models/conference'
import {useTranslation} from '@models/locales'
import {isDarkColor, isVrmUrl, rgb2Color} from '@models/utils'
import {Observer} from 'mobx-react-lite'
import React, {useState} from 'react'
import {SketchPicker} from 'react-color'
import {SignalQualityButton} from './SignalQuality'
import {Choose3DAvatar, vrmUrlBase} from './LocalParticipant3DAvatarForm'
import {Grid} from '@material-ui/core'
import {participants, map, roomInfo} from '@stores/'


function makeEmailDisp(email: string){
  const lastSlashIdx = email.lastIndexOf('/')+1
  const base = email.substring(0, lastSlashIdx)
  if (base === vrmUrlBase){
    const file = email.substring(lastSlashIdx)
    return file
  }
  return email
}

export interface LocalParticipantFormProps{
  open: boolean
  anchorEl: HTMLElement | null
  anchorOrigin: PopoverOrigin
  close: () => void,
  anchorReference?: PopoverReference
}

export const LocalParticipantForm: React.FC<LocalParticipantFormProps> = (props: LocalParticipantFormProps) => {
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


  const onKeyDown = (ev:React.KeyboardEvent) => {
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
  const [show3D, setShow3D] = useState<boolean>(false)

  return <Popover {...popoverProps} style={dialogStyle} onClose={closeConfig}>
    {show3D ? <Choose3DAvatar {...popoverProps} close={()=>{setShow3D(false)}} /> : undefined}
    <DialogTitle>
      <span style={titleStyle}>
        {t('lsTitle')}
      </span>
      <span style={{float:'right'}}>
        <SignalQualityButton open={props.open} transport={conference.rtcTransports.sendTransport}/></span>
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
            onKeyDown={onKeyDown} fullWidth={true}
          />
          <Box mt={3}>
            <div style={{fontSize:12}}>{t('lsColor')}</div>
            <Box ml={2}>
              <Button variant="contained"
                style={{backgroundColor:rgb2Color(rgb), color:textColor, ...buttonStyle}}
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
                style={{color:rgb2Color(textRgb), backgroundColor:backColor, marginLeft:15, ...buttonStyle}}
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
              <Button variant="contained" style={{marginLeft:15, ...buttonStyle}}
                onClick={()=>{local.information.color=[]; local.information.textColor=[]}} >
                {t('lsAutoColor')}</Button>
            </Box>
          </Box>
          <Box mt={3}>
            <div style={{fontSize:12}}>{t('lsAvatar')}</div>
            <Box mt={-1} ml={2}>
              <form key="information" onSubmit = {uploadAvatarSrc}
                style={{display:'inline', lineHeight:'2em'}}>
                <div style={{fontSize:12, marginTop:8}}>{t('lsImageFile')}
                </div>
                {local.information.avatarSrc && !isVrmUrl(local.information.avatarSrc) ? <>
                  <img src={local.information.avatarSrc} style={{height:'1.5em', verticalAlign:'middle'}} alt="avatar"/>
                  <input style={inputStyle} type="submit" onClick={clearAvatarSrc} value="✕" /> &nbsp;
                </> : undefined}
                <input style={inputStyle} type="file" onChange={(ev) => {
                  setFile(ev.target.files?.item(0))
                }} />
                <input style={inputStyle} type="submit" value="Upload" />
              </form>
              </Box>
              <Box ml={2} style={{display:'flex', alignItems:'flex-end'}}>
                <TextField label={t('lsEmail')} multiline={false}
                  value={makeEmailDisp(local.information.email)}
                  style={{...tfDivStyle, marginTop:8}}
                  inputProps={{style: tfIStyle, autoFocus:true}} InputLabelProps={{style: tfLStyle}}
                  onChange={event => local.information.email = event.target.value}
                  onKeyDown={onKeyDown} fullWidth={true}
                />
                <Button variant="contained" size="small"
                  style={{marginLeft:5, textTransform:'none', minWidth:15, ...buttonStyle}}
                  onClick={()=>{
                    setShow3D(true)
                  }}>{t('ls3D')}
                </Button>
            </Box>
          </Box>
          <Box mt={3}>
            <div style={{fontSize:12}}>{t('lsNotification')}</div>
            <Box mt={-1} ml={2}>
            <CheckWithLabel checked={local.information.notifyCall}
              onChange={(ev)=>{local.information.notifyCall = ev.target.checked}}
              label={t('lsNotifyCall')} />
            <CheckWithLabel checked={local.information.notifyTouch}
              onChange={(ev)=>{local.information.notifyTouch = ev.target.checked}}
              label={t('lsNotifyTouch')} />
            <CheckWithLabel checked={local.information.notifyNear}
              onChange={(ev)=>{local.information.notifyNear = ev.target.checked}}
              label={t('lsNotifyNear')} />
            <CheckWithLabel checked={local.information.notifyYarn}
              onChange={(ev)=>{local.information.notifyYarn = ev.target.checked}}
              label={t('lsNotifyYarn')} />
            </Box>
          </Box>
        </>}}
      </Observer>
      <Box mt={4} mb={3}>
        <Button variant="contained" color="primary" style={{...buttonStyle}}
          onClick={()=>{
            closeConfig({}, 'enter')
          }}>{t('btSave')}</Button>
        <Button variant="contained" color="secondary" style={{marginLeft:15, ...buttonStyle}}
          onClick={()=>{ local.loadInformationFromStorage()}}>{t('btCancel')}</Button>
        <Button variant="contained" style={{marginLeft:15, ...buttonStyle}}
          onClick={()=>{
            map.focusOn(local)
          }}>{t('ctFocus')}</Button>
      </Box>
      {roomInfo.loginEmail || roomInfo.gDriveEmail ?
        <Box >
          <Grid container>
            <Grid item xs={6}> <div style={{fontSize:12}}>{t('lsLoginEmail')}</div>
              <Box>
                {roomInfo.loginEmail}
              </Box>
            </Grid>
            <Grid item xs={6}> <div style={{fontSize:12}}>{t('lsGDriveEmail')}</div>
              <Box>
                {roomInfo.gDriveEmail}
              </Box>
            </Grid>
          </Grid>
        </Box>
        : undefined}
    </DialogContent>
  </Popover>
}
