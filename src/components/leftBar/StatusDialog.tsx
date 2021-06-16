import DialogContent from '@material-ui/core/DialogContent'
import DialogTitle from '@material-ui/core/DialogTitle'
import Popover, { PopoverProps } from '@material-ui/core/Popover'
import { connection } from '@models/api'
import React from 'react'
import {useEffect, useState} from 'react'
import {Stores} from '../utils'

export interface StatusDialogProps extends PopoverProps, Stores{
  close: () => void,
}

class Remote{
  address = ''
  port = 0
  protocol = ''
}
class Status{
  nSessions = 0
  remotes: Remote[] = []
  open = false
  update = false
}
const status = new Status()

export const StatusDialog: React.FC<StatusDialogProps> = (props: StatusDialogProps) => {
  const [update,setUpdate] = useState<boolean>(false)
  status.open = props.open
  status.update = update

  function updateStatus(){
    const chatRoom = connection.conference._jitsiConference?.room
    if (status.open && chatRoom){
      const sessions = chatRoom.xmpp?.connection?.jingle?.sessions
      status.nSessions = 0
      for(const id in sessions){
        status.nSessions += 1
        const sess = sessions[id]
        const pc = sess?.peerconnection?.peerconnection as RTCPeerConnection
        pc.getStats().then((stats) => {
          const pairs: any[] = []
          stats.forEach((v, k) => {
            if (v.type === 'candidate-pair' && (v.bytesReceived > 0 || v.bytesSent > 0)) {
              pairs.push(v)
            }
          })
          const remoteCandidateIds = pairs.map(p => p.remoteCandidateId)
          status.remotes=[]
          remoteCandidateIds.forEach(id => {
            const remote = new Remote()
            const v = stats.get(id)
            remote.address = v.address
            remote.port = v.port
            remote.protocol = v.protocol
            status.remotes.push(remote)
          })
        })
      }
      setUpdate(status.update ? false : true)
    }
  }
  useEffect(() => {
    setInterval(updateStatus, 1000)
  }, [])
  const {close, ...popoverProps} = props

  return <Popover {...popoverProps} onClose={()=>props.close()}>
    <DialogTitle>
      {'Status report'}
    </DialogTitle>
    <DialogContent>
      <div style={{overflowY:'auto'}}>
        {`${status.nSessions} sessions`}<br />
        Bridge: {status.remotes.map((r,k) => <span key={k.toString()}>{r.address} {r.port}/{r.protocol}<br /></span>)}
      </div>
    </DialogContent>
  </Popover>
}
