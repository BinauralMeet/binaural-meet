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
import {Observer} from 'mobx-react-lite'
import React, {useState} from 'react'
import {SketchPicker} from 'react-color'

export interface ConfigFormProps extends PopoverProps{
  close: () => void,
}

const tfIStyle = {fontSize: isSmartphone() ? '2em' : '1em',
height: isSmartphone() ? '2em' : '1.5em'}
const tfDivStyle = {height: isSmartphone() ? '4em' : '3em'}
const tfLStyle = {fontSize: isSmartphone() ? '1em' : '1em'}
const iStyle = {fontSize: isSmartphone() ? '2.5rem' : '1rem'}

export const ConfigForm: React.FC<ConfigFormProps> = (props: ConfigFormProps) => {
  const participants = useStore()
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
  const popoverProps = Object.assign({}, props)
  delete (popoverProps as Partial<ConfigFormProps>).close

  return <Popover {...popoverProps} onClose={closeConfig}>
    <DialogTitle>
      <span  style={{fontSize: isSmartphone() ? '2.5em' : '1em'}}>
        {t('asTitle')}
      </span>
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
            <div style={{fontSize:12}}>{t('asColor')}</div>
            <Box ml={2}>
              <Button variant="contained"
                style={{backgroundColor:rgb2Color(rgb), color:textColor}}
                onClick={()=>{setShowColorPicker(true)}} ref={colorButton}>
                {t('asColorAvatar')}</Button>
              <Popover open={showColorPicker} onClose={()=>{setShowColorPicker(false)}}
                anchorEl={colorButton.current} anchorOrigin={{vertical:'bottom', horizontal:'right'}}>
                <SketchPicker color = {{r:rgb[0], g:rgb[1], b:rgb[2]}} disableAlpha
                  onChange={(color, event)=>{
                    event.preventDefault()
                    local.information.color = [color.rgb.r, color.rgb.g, color.rgb.b]
                  }}
                  />
              </Popover>
              <Button variant="contained" style={{color:rgb2Color(textRgb), backgroundColor:backColor, marginLeft:15}}
                onClick={()=>{setShowTextColorPicker(true)}} ref={textColorButton}>
                {t('asColorText')}</Button>
              <Popover open={showTextColorPicker} anchorOrigin={{vertical:'bottom', horizontal:'right'}}
                onClose={()=>{setShowTextColorPicker(false)}} anchorEl={textColorButton.current}>
                <SketchPicker color = {{r:textRgb[0], g:textRgb[1], b:textRgb[2]}}
                  onChange={(color, event)=>{
                    event.preventDefault()
                    local.information.textColor = [color.rgb.r, color.rgb.g, color.rgb.b]
                  }}
                />
              </Popover>
              <Button variant="contained" style={{marginLeft:15}}
                onClick={()=>{local.information.color=[]; local.information.textColor=[]}} >
                {t('asAutoColor')}</Button>
            </Box>
          </Box>
          <Box mt={3}>
            <div style={{fontSize:12}}>{t('asImage')}</div>
            <Box mt={-1} ml={2}>
              <TextField label={t('asEmail')} multiline={false} value={local.info.email}
                style={{...tfDivStyle, marginTop:8}}
                inputProps={{style: tfIStyle, autoFocus:true}} InputLabelProps={{style: tfLStyle}}
                onChange={event => local.info.email = event.target.value}
                onKeyPress={onKeyPress} fullWidth={true}
              />
            <form key="information" onSubmit = {uploadAvatarSrc}
              style={{lineHeight:'2em', fontSize: isSmartphone() ? '2.5em' : '1em'}}>
              <div style={{fontSize:12, marginTop:8}}>{t('asImageFile')}</div>
              {local.information.avatarSrc ? <>
                <img src={local.information.avatarSrc} style={{height:'1.5em', verticalAlign:'middle'}} alt="avatar"/>
                <input style={iStyle} type="submit" onClick={clearAvatarSrc} value="✕" /> &nbsp;
              </> : undefined}
              <input style={iStyle} type="file" onChange={(ev) => {
                setFile(ev.target.files?.item(0))
              }} />
              <input style={iStyle} type="submit" value="Upload" />
            </form>
            </Box>
          </Box>
        </>}}
      </Observer>
      <Box mt={4} mb={3}>
        <Button variant="contained" color="primary"
          onClick={()=>{
            closeConfig({}, 'enter')
          }}>{t('asSave')}</Button>
        <Button variant="contained" style={{marginLeft:15}} color="secondary"
          onClick={()=>{ local.loadInformationFromStorage()}}>{t('asCancel')}</Button>
      </Box>
    </DialogContent>
  </Popover>
}
