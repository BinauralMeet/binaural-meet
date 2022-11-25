import Button from '@material-ui/core/Button'
import Paper from '@material-ui/core/Paper'
import Popper, { PopperProps } from '@material-ui/core/Popper'
import { StreamStat, TransportStat } from '@models/conference/RtcConnection'
import React from 'react'
import {BMProps} from '../utils'
import {conference} from '@models/conference'
import { useObserver } from 'mobx-react-lite'
import errorInfo from '@stores/ErrorInfo'
import {useTranslation} from '@models/locales'
import {ConnectionStat} from '@components/map/Participant/SignalQuality'

declare const config:any             //  from ../../config.js included from index.html

function resetRtc(){
  conference.rtcConnection.forceClose()
}
function resetDataConnection(){
  conference.dataConnection.forceClose()
}

export interface StatusDialogProps extends Omit<PopperProps, 'children'>, BMProps{
  close: () => void,
}
export const StatusDialog: React.FC<StatusDialogProps> = (props: StatusDialogProps) => {
  const {t} = useTranslation()
  const stat = useObserver(()=>{
    const stats:TransportStat[] = []
    const senderStat = conference.sendTransport?.appData?.stat as (TransportStat|undefined)
    if (senderStat) stats.push(senderStat)
    const receiverStats:TransportStat[] = Array.from(conference.remotePeers.values())
      .map(remote => remote.transport?.appData?.stat as (TransportStat)).filter(s=>s!==undefined)
    stats.push(...receiverStats)
    const servers:[string, string, string|undefined][] = []
    const sum = {} as any
    const streams:StreamStat[] = []
    for(const ts of stats){
      for(const key in ts){
        if (key !== 'turn' && key !== 'streams' && key !== 'localServer' && key !== 'remoteServer'){
          if (sum[key]) sum[key] = sum[key] + (ts as any)[key]
          else sum[key] = (ts as any)[key]
        }
      }
      if (ts.remoteServer){
        const len = ts.remoteServer.lastIndexOf(':')
        const serverAddr = ts.remoteServer!.substring(0,len)
        const sameAddr = servers.find(s => s[0]===ts.dir && s[1].substring(0, len) === serverAddr)
        if (!sameAddr){
          servers.push([ts.dir, ts.remoteServer, ts.turn])
        }else{
          const port = ts.remoteServer!.substring(len+1)
          sameAddr[1] += `,${port}`
        }
        streams.push(...ts.streams)
      }
    }
    if (stats.length){
      const tStatSum = sum as TransportStat
      tStatSum.fractionLost = tStatSum.fractionLost ? tStatSum.fractionLost/stats.length : undefined
      tStatSum.jitter = tStatSum.jitter ? tStatSum.jitter/stats.length : undefined
      tStatSum.quality = tStatSum.quality ? tStatSum.quality/stats.length : undefined
      tStatSum.roundTripTime  = tStatSum.roundTripTime ? tStatSum.roundTripTime/stats.length : undefined
    }
    const data = errorInfo.types.has('dataConnection') ? undefined : config.bmRelayServer
    return {
      transport: stats.length ? sum as TransportStat : undefined,
      streams,
      servers,
      data,
    }
  })

  const {close, ...poperProps} = props
  return <Popper {...poperProps} disablePortal={false} style={{zIndex:2}}>
    <Paper style={{background:'rgba(255,255,255,1)', padding:'0.4em'}}>
      <div style={{overflowY:'auto'}}>
        <strong>{t('connectionStatus')}</strong>
        &nbsp;
        <Button color="primary" size="small" style={{textTransform:'none'}}
          onClick={resetRtc}
        >{t('emResetRtc')}</Button>
        <Button color="primary" size="small" style={{textTransform:'none'}}
          onClick={resetDataConnection}
        >{t('emResetData')}</Button>
        <br />
        <div> Data: {stat.data}</div>
        {stat.servers.length === 0 ? <div>'No RTC server'</div> :
          stat.servers.map((server, idx) => <div key={idx}>
            RTC{server[0]==='send'?'⇑':'⇓'}:{server[1]}
            {server[2] ? <><br/>&nbsp; via {server[2]}</> : undefined}
        </div>)}
        <ConnectionStat stat={stat.transport} streams={stat.streams} />
      </div>
      <Button variant="contained" color="primary" style={{textTransform:'none', marginTop:'0.4em'}}
        onClick={close}
        >{t('emClose')}</Button>
    </Paper>
  </Popper>
}
