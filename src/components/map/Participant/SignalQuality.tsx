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
import {useTranslation} from '@models/locales'
import React from 'react'
import {useObserver} from 'mobx-react-lite'
import { StreamStat, TransportStat } from '@models/conference/RtcConnection'


export interface ConnectionStatProps{
  stat?: TransportStat
  streams?: StreamStat[]
}
export const ConnectionStat: React.FC<ConnectionStatProps> = (props:ConnectionStatProps) => {
  const stat = props.stat
  const streams = props.streams
  return <>
    {stat?.turn ? <div>RTC via {stat.turn}</div> : undefined}
    {stat?.server ? <div>RTC server {stat.server}</div> : undefined}
    <div>⇑{((stat?.sentBytePerSec || 0)/1000).toFixed(1)}k&nbsp;
      ⇓{((stat?.receivedBytePerSec || 0)/1000).toFixed(1)}k&nbsp;
      {stat?.quality!==undefined ? <>Quality:{stat.quality.toFixed(0)}%&nbsp;</> : undefined}
      {stat?.roundTripTime ? <>RTT:{(stat.roundTripTime*1000).toFixed(0)}ms&nbsp;</> : undefined}
      {stat?.fractionLost!==undefined ? <>Lost:{(stat?.fractionLost*100).toFixed(2)}%</> : undefined}
    </div>
    <div>Streams:</div>
    {streams?.map(s => {
      return <div key={s.id}>&nbsp;
        {s.dir==='send' ? '⇑' : '⇓'}
        {s.codec && <>{s.codec}&nbsp;</>}
        {((s.bytesPerSec ? s.bytesPerSec : 0)/1000).toFixed(1)}k
        {s.roundTripTime ? <>&nbsp; RTT:{(s.roundTripTime*1000).toFixed(0)}ms</> : undefined}
        {s.fractionLost!==undefined ? <>&nbsp; Lost:{(s.fractionLost*100).toFixed(2)}%</> : undefined}
        {s.jitter!==undefined ? <>&nbsp; Jitter:{(s.jitter*1000).toFixed(0)}ms</> : undefined}
      </div>
    })}
  </>
}

export interface ConnectionQualityDialogProps{
  open: boolean
  stat?: TransportStat
  isLocal?: boolean
  anchorEl: null | HTMLElement
  onClose?: ()=>void
}
export const ConnectionQualityDialog: React.FC<ConnectionQualityDialogProps>
  = (props: ConnectionQualityDialogProps) => {
  const {t} = useTranslation()
  const stat = useObserver<TransportStat|undefined>(()=> (props.stat ? {...props.stat} : undefined))

  return <Popover open={props.open} anchorEl={props.anchorEl} >
    <DialogTitle>
      {t('connectionStatus')}
    </DialogTitle>
    <DialogContent>
      <ConnectionStat stat={stat} streams={stat?.streams} />
      <Button variant="contained" color="primary" style={{textTransform:'none', marginTop:'0.4em'}}
        onClick={(ev) => {
          ev.stopPropagation()
          if (props.onClose){props.onClose()}
        }}
        >{t('emClose')}
      </Button>
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
  if (quality !== undefined){
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
  stat?: TransportStat
}
export const SignalQualityButton: React.FC<SignalQualityButtonProps> = (props:SignalQualityButtonProps) => {
  const [open, setOpen] = React.useState(false)

  const ref = React.useRef<HTMLButtonElement>(null)

  return <IconButton ref={ref} onClick={()=>{ setOpen(true) }}>
    <SignalQualityIcon quality={props.stat?.quality} />
    <ConnectionQualityDialog stat={props.stat} open={open}
      anchorEl={ref.current} onClose={()=>{
        setOpen(false)
    }}/>
  </IconButton>
}

