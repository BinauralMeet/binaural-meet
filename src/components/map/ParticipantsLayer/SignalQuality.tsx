import Button from '@material-ui/core/Button'
import DialogContent from '@material-ui/core/DialogContent'
import DialogTitle from '@material-ui/core/DialogTitle'
import IconButton from '@material-ui/core/IconButton'
import Popover from '@material-ui/core/Popover'
import SignalCellular0BarIcon from '@material-ui/icons/SignalCellular0Bar'
import SignalCellular1BarIcon from '@material-ui/icons/SignalCellular1Bar'
import SignalCellular2BarIcon from '@material-ui/icons/SignalCellular2Bar'
import SignalCellular3BarIcon from '@material-ui/icons/SignalCellular3Bar'
import SignalCellular4BarIcon from '@material-ui/icons/SignalCellular4Bar'
import {connection} from '@models/api'
import {useTranslation} from '@models/locales'
import {SharedContents} from '@stores/sharedContents/SharedContents'
import React from 'react'

declare const config:any             //  from ../../config.js included from index.html


export interface ConnectionQualityDialogProps{
  open: boolean
  contents?: SharedContents
  isLocal?: boolean
  anchorEl: null | HTMLElement
  onClose?: ()=>void
}
export const ConnectionQualityDialog: React.FC<ConnectionQualityDialogProps>
  = (props: ConnectionQualityDialogProps) => {
  const stats:string[] = [] /*TODO:get stats Array.from(props.contents ? props.contents.tracks.contentCarriers.values() : [])
    .filter(c => c&&c.jitsiConference).map(c => c.jitsiConference!.connectionQuality.getStats())
    */
  const bitrates:{video:{upload:1, download:2}, audio:{upload:1, download:2}}[] = [] //stats.filter(s=>s.bitrate).map(s=>s.bitrate!)
  const statSum = {
    audio: {
      up: bitrates.map(b => b.audio.upload).reduce((a, b) => a+b, 0),
      down: bitrates.map(b => b.audio.download).reduce((a, b) => a+b, 0),
    },
    video: {
      up: bitrates.map(b => b.video.upload).reduce((a, b) => a+b, 0),
      down: bitrates.map(b => b.video.download).reduce((a, b) => a+b, 0),
    }
  }
  const loss = {
  }
  const {t} = useTranslation()

  let messageServer = ''
  if (props.isLocal){
    messageServer = config.bmRelayServer
  }


  return <Popover open={props.open} anchorEl={props.anchorEl} >
    <DialogTitle>
      {t('connectionStatus')}
    </DialogTitle>
    <DialogContent>
    <div style={{overflowY:'auto'}} />
    <br />
    <Button variant="contained" color="primary" style={{textTransform:'none', marginTop:'0.4em'}}
      onClick={(ev) => {
        ev.stopPropagation()
        if (props.onClose){props.onClose()}
      }}
      >{t('emClose')}</Button>
  </DialogContent>
  <br />
  </Popover>
}


export interface SignalIconProps{
  quality?: number
  className?: string
}
export const SignalQualityIcon: React.FC<SignalIconProps> = (props) => {
  let qualityIcon: JSX.Element|undefined = undefined
  const quality = props.quality
  if (quality){
    qualityIcon = <SignalCellular0BarIcon className={props.className} style={{color:'red'}} />
    if(quality > 30) { qualityIcon =
      <SignalCellular1BarIcon className={props.className} style={{color:'orange'}} /> }
    if(quality > 50) { qualityIcon =
      <SignalCellular2BarIcon className={props.className} style={{color:'gold'}} /> }
    if(quality > 70) { qualityIcon =
      <SignalCellular3BarIcon className={props.className} style={{color:'yellow'}} /> }
    if(quality > 90) { qualityIcon =
      <SignalCellular4BarIcon className={props.className} style={{color:'green'}} /> }
  }

  return <>{qualityIcon}</>
}

export interface SignalQualityButtonProps{
  open: boolean
  anchorEl?: HTMLElement |  null
  isLocal?:boolean
}
export const SignalQualityButton: React.FC<SignalQualityButtonProps> = (props:SignalQualityButtonProps) => {
  const [open, setOpen] = React.useState(false)

  const ref = React.useRef<HTMLButtonElement>(null)

  return <IconButton ref={ref} onClick={()=>{ setOpen(true) }}>
    <SignalQualityIcon quality={4} />
    <ConnectionQualityDialog open={open}
      anchorEl={ref.current} onClose={()=>{
        setOpen(false)
    }}/>
  </IconButton>
}

