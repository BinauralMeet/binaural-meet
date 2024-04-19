import {BMProps} from '@components/utils'
import List from '@material-ui/core/List'
import {useTranslation} from '@models/locales'
import React, {useEffect} from 'react'
import {DialogPageProps} from './Step'
import {DialogIconItem, DialogItem} from '@components/utils/DialogIconItem'
import {player, recorder, dbRecords, DBRecord} from '@models/conference/Recorder'
import PlayIcon from '@material-ui/icons/PlayArrow'
import RecordIcon from '@material-ui/icons/FiberManualRecord'
import StopIcon from '@material-ui/icons/Stop'
import DeleteIcon from '@material-ui/icons/DeleteForever'
import DownloadIcon from '@material-ui/icons/GetApp'
import {useLiveQuery} from 'dexie-react-hooks'
import { Divider, IconButton, TextField } from '@material-ui/core'
import { Observer } from 'mobx-react-lite'

interface RecorderMenuProps extends DialogPageProps, BMProps {
}

export const RecorderMenu: React.FC<RecorderMenuProps> = (props) => {
  const {t} = useTranslation()
  const {map} = props.stores
  const fileToPlay = React.useRef<HTMLInputElement>(null)
  const [startTime, setStartTime] = React.useState('0')

  function startStopRecord(){
    props.setStep('none')
    if (recorder.recording){
      recorder.stop()
    }else{
      recorder.start(props.stores)
    }
  }
  function deleteRecord(id: number){
    const record = records?.find(r => r.id === id)
    if (record && record.id){
      dbRecords.delete(record.id)
    }
  }
  function downloadRecord(id: number){
    const record = records?.find(r => r.id === id)
    if (record && record.blob){
      const url = URL.createObjectURL(record.blob)
      const link = document.createElement('a')
      link.href=url
      link.download = `${record.title}.bin`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }
  function startStopPlayback(id?: number){
    if (player.playing){
      player.stop()
      props.setStep('none')
    }else if (id){
      const record = records?.find(r => r.id === id)
      if (record && record.blob){
        props.setStep('none')
        player.load(record.blob).then(()=>{
          player.play(Number(startTime))
        })
      }
    }
  }
  function playFile(){
    fileToPlay.current?.click()
  }
  //  keyboard shortcut
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (map.keyInputUsers.has('recorderDialog')) {
        if (e.code === 'KeyR') {
          startStopRecord()
        }else if (e.code === 'KeyL') {
          playFile()
        }else if (e.code === 'KeyP') {
          startStopPlayback()
        }
      }
    }
    window.addEventListener('keypress', onKeyDown)
    return () => {
      window.removeEventListener('keypress', onKeyDown)
    }
    //  eslint-disable-next-line react-hooks/exhaustive-deps
  },        []);

  useEffect(()=>{
    recorder.convertDiffsToRecord().catch(()=>{})
  })

  const records = useLiveQuery(async ()=>{
    return await dbRecords.where('title').notEqual('').toArray()
  }) as DBRecord[] | undefined

  const pass = props.stores.roomInfo.roomProps.get('password')
  const isAdmin = props.stores.roomInfo.password === (pass ? pass : '')

  return (
    <>
    <TextField label="Start time" type="text" style={{}}
      value={startTime} onChange={(ev)=>{ setStartTime(ev.currentTarget.value) }} />
    <List>
      {isAdmin ? <DialogIconItem
        key="record" text={t(recorder.recording ? 'recorderStop' : 'recorderStart')}
          icon={recorder.recording ? <StopIcon /> : <RecordIcon /> }
          onClick={startStopRecord}
      />: undefined}
      {player.playing ? undefined : <>
        <input type="file" accept="application/octet-stream" ref={fileToPlay} style={{display:'none'}}
          onChange={ (ev) => {
            const files = ev.currentTarget?.files
            if (files && files.length) {
              props.setStep('none')
              player.load(files[0]).then(()=>{
                player.play(Number(startTime))
              })
            }
          }}  />
        <DialogIconItem
          key="play" text={t('playerPlayfile')}
          icon={<PlayIcon /> }
          onClick={playFile}
        />
      </>}
      {!recorder.recording && records?.length ? <Divider /> : undefined}
      <Observer>{()=>{
        if (player.playing){
          return <DialogIconItem
            key="stopPlay" text={t('playerStop')}
            icon={<StopIcon />}
            onClick={startStopPlayback}
          />
        }else{
          return null
        }
      }}</Observer>
      {!recorder.recording && records?.map((r)=>{
        const du = new Date(r.duration)
        const h = du.getUTCHours()
        const m = du.getMinutes()
        const duration = (h ? `${h}:` : '') + (m ? `${m}:` :'') + `${du.getSeconds()}.${(du.getMilliseconds()/100).toFixed(0)}`
        return <DialogItem
          key={r.id}
          icon = {<><IconButton size='small' onClick={()=>r.id && deleteRecord(r.id)}><DeleteIcon /></IconButton> </>}
          plain={<>
            <span style={{display:'inline-block', width :'24em'}}>{r.title}</span>
            <span style={{display:'inline-block', width :'4em'}}>{duration}</span>
            &nbsp;&nbsp;
            <IconButton size='small' onClick={()=>r.id && startStopPlayback(r.id)}><PlayIcon /></IconButton>
            &nbsp;&nbsp;
            <IconButton size='small' onClick={()=>r.id && downloadRecord(r.id)}><DownloadIcon /></IconButton>
          </>}
        />
      })}
    </List>
    </>
  )
}
RecorderMenu.displayName = 'RecorderMenu'
