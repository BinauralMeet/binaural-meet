import Button from '@material-ui/core/Button'
import Paper from '@material-ui/core/Paper'
import Popper, { PopperProps } from '@material-ui/core/Popper'
import { connection } from '@models/api'
import contents from '@stores/sharedContents/SharedContents'
import React from 'react'
import {useState} from 'react'
import {BMProps} from '../utils'

declare const config:any             //  from ../../config.js included from index.html

export interface StatusDialogProps extends Omit<PopperProps, 'children'>, BMProps{
  close: () => void,
}

class Remote{
  address = ''
  port = 0
  protocol = ''
}
class Session{
  remotes: Remote[] = []
}
class Status{
  sessions: Session[] = []
  open = false
  update = false
  interval: NodeJS.Timeout|undefined = undefined
  messageServer = ''
}
const status = new Status()

export const StatusDialog: React.FC<StatusDialogProps> = (props: StatusDialogProps) => {
  const [update,setUpdate] = useState<boolean>(false)
  status.open = props.open === true
  status.update = update

  function updateStatus(){
    const chatRoom = connection.conference._jitsiConference?.room
    if (status.open && chatRoom){
      const sessions = chatRoom.xmpp?.connection?.jingle?.sessions
      const nSessions = Object.keys(sessions).length
      status.sessions.splice(nSessions)
      while (status.sessions.length < nSessions){ status.sessions.push(new Session()) }
      for(const id in sessions){
        const pc = sessions[id]?.peerconnection?.peerconnection as RTCPeerConnection
        if (pc){
          pc.getStats().then((stats) => {
            const pairs: any[] = []
            stats.forEach((v, k) => {
              if (v.type === 'candidate-pair' && (v.bytesReceived > 0 || v.bytesSent > 0)) {
                pairs.push(v)
              }
            })
            const remoteCandidateIds = pairs.map(p => p.remoteCandidateId)
            const sess = status.sessions[status.sessions.length-1]
            sess.remotes=[]
            remoteCandidateIds.forEach(id => {
              const remote = new Remote()
              const v = stats.get(id)
              remote.address = v.address
              remote.port = v.port
              remote.protocol = v.protocol
              sess.remotes.push(remote)
            })
          })
        }
      }
      setUpdate(status.update ? false : true)
    }
    if (connection.conference.bmRelaySocket?.readyState === WebSocket.OPEN) {
      status.messageServer = config.bmRelayServer
    }else{
      const chatRoom = connection.conference._jitsiConference?.room
      if (status.open && chatRoom){
        status.messageServer = 'bridge'
      }else{
        status.messageServer = 'prosody'
      }
    }
  }
  if (props.open){
    if (!status.interval){
      status.interval = setInterval(updateStatus, 100)
      //console.log('setInterval')
    }
  }else{
    if (status.interval){
      clearInterval(status.interval)
      status.interval = undefined
      //console.log('clearInterval')
    }
  }
  const {close, ...poperProps} = props
  const stat = connection.conference._jitsiConference?.connectionQuality.getStats()
  const stats = Array.from(contents.tracks.contentCarriers.values())
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
  const codecSet = new Set<string>()
  for(const pid in stat?.codec){
    const p = stat?.codec[pid]
    for (const ssrc in p){
      codecSet.add(p[ssrc].audio)
      codecSet.add(p[ssrc].video)
    }
  }
  const codecs = Array.from(codecSet)

  return <Popper {...poperProps}>
    <Paper style={{background:'rgba(255,255,255,0.6)', padding:'0.4em'}}>
      <div style={{overflowY:'auto'}}>
        <strong>Servers</strong><br />
        {status.sessions.length === 0 ? <div>No WebRTC</div> :
        status.sessions.map((sess, idx) => <div key={idx}>
          WebRTC: {sess.remotes.map((r,k) => <span key={k.toString()}>{r.address} {r.port}/{r.protocol}<br /></span>)}
        </div>)}
        <div> Message: {status.messageServer}</div>
        <div> Bitrate (kbps): audio: ⇑{statSum.audio.up}&nbsp; ⇓{statSum.audio.down}
        &nbsp;&nbsp; video: ⇑{statSum.video.up}&nbsp; ⇓{statSum.video.down}</div>
        <div> Quality:{Math.round((stat?.connectionQuality || 0) * 10) / 10} &nbsp; Loss: ⇑{loss.up}&nbsp; ⇓{loss.down}
        &nbsp;&nbsp;RTT:{stat?.jvbRTT}
        {codecs.length ? <>&nbsp;&nbsp;Codecs:{`${codecs}`}</> : undefined}
        </div>
        {/*<div> Quality: {JSON.stringify(stat)}</div>*/}
      </div>
      <Button variant="contained" color="primary" style={{textTransform:'none', marginTop:'0.4em'}}
        onClick={close}
        > Close </Button>

    </Paper>
  </Popper>
}
