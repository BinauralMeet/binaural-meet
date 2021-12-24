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
import {ConnectionQualityStats} from 'lib-jitsi-meet/JitsiConference'
import React from 'react'

declare const config:any             //  from ../../config.js included from index.html


export interface ConnectionQualityDialogProps{
  stats: ConnectionQualityStats
  open: boolean
  contents?: SharedContents
  isLocal?: boolean
  anchorEl: null | HTMLElement
  onClose?: ()=>void
}
export const ConnectionQualityDialog: React.FC<ConnectionQualityDialogProps>
  = (props: ConnectionQualityDialogProps) => {
  const stat = props.stats
  const stats = Array.from(props.contents ? props.contents.tracks.contentCarriers.values() : [])
    .filter(c => c&&c.jitsiConference).map(c => c.jitsiConference!.connectionQuality.getStats())
  if (stat) { stats.unshift(stat) }
  const bitrates = stats.filter(s=>s.bitrate).map(s=>s.bitrate!)
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
    up: stat?.packetLoss?.upload || 0,
    down: stat?.packetLoss?.download || 0
  }
  const {t} = useTranslation()

  let messageServer = ''
  if (props.isLocal){
    if (connection.conference.bmRelaySocket?.readyState === WebSocket.OPEN) {
      messageServer = config.bmRelayServer
    }else{
      const chatRoom = connection.conference._jitsiConference?.room
      if (chatRoom){
        messageServer = 'bridge'
      }else{
        messageServer = 'prosody'
      }
    }
  }


  return <Popover open={props.open} anchorEl={props.anchorEl} >
    <DialogTitle>
      {t('connectionStatus')}
    </DialogTitle>
    <DialogContent>
    <div style={{overflowY:'auto'}}>
      <div> Quality:{Math.round((stat?.connectionQuality || 0) * 10) / 10} &nbsp; Loss: ⇑{loss.up}&nbsp; ⇓{loss.down}
        &nbsp;&nbsp;RTT:{stat?.jvbRTT}
      </div>
      {props.isLocal ?
        !stat.transport || stat.transport.length===0 ? <div>No WebRTC</div> :
        stat.transport.map((sess, idx) => <div key={idx}>
          WebRTC: <span>{sess.ip}/{sess.type}<br /></span>
        </div>) : undefined}
      {props.isLocal ? <div> Message: {messageServer}</div> : undefined}
      <div> Bitrate (kbps): audio: ⇑{statSum.audio.up}&nbsp; ⇓{statSum.audio.down}
      &nbsp;&nbsp; video: ⇑{statSum.video.up}&nbsp; ⇓{statSum.video.down}</div>
      {/*<div> Quality: {JSON.stringify(stat)}</div>*/}
      </div>
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
  stats?: ConnectionQualityStats
  open: boolean
  anchorEl?: HTMLElement |  null
  isLocal?:boolean
}
export const SignalQualityButton: React.FC<SignalQualityButtonProps> = (props:SignalQualityButtonProps) => {
  const [open, setOpen] = React.useState(false)

  const ref = React.useRef<HTMLButtonElement>(null)

  return <IconButton ref={ref} onClick={()=>{ setOpen(true) }}>
    <SignalQualityIcon quality={props.stats?.connectionQuality} />
    {props.stats ? <ConnectionQualityDialog open={open} stats={props.stats} isLocal={props.isLocal}
      anchorEl={ref.current} onClose={()=>{
        setOpen(false)
      }}/> : undefined }
  </IconButton>
}

