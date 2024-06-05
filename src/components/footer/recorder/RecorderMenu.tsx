import List from '@material-ui/core/List'
import {useTranslation} from '@models/locales'
import React, {useEffect} from 'react'
import {DialogPageProps} from './RecorderDialog'
import {DialogIconItem, DialogItem} from '@components/utils/DialogIconItem'
import {player, recorder, dbRecords, DBRecord} from '@models/recorder'
import PlayIcon from '@material-ui/icons/PlayArrow'
import RecordIcon from '@material-ui/icons/FiberManualRecord'
import StopIcon from '@material-ui/icons/Stop'
import DeleteIcon from '@material-ui/icons/DeleteForever'
import DownloadIcon from '@material-ui/icons/GetApp'
import InfoIcon from '@material-ui/icons/Info'
import {useLiveQuery} from 'dexie-react-hooks'
import { Divider, IconButton, TextField } from '@material-ui/core'
import { Observer } from 'mobx-react-lite'
import {map} from '@stores/'
import { timeToHourMinSec } from '@models/utils/date'


export const RecorderMenu: React.FC<DialogPageProps> = (props) => {
  const {t} = useTranslation()
  const fileToPlay = React.useRef<HTMLInputElement>(null)
  const [startTime, setStartTime] = React.useState('0')

  function startStopRecord(){
    props.setRecorderStep('none')
    if (recorder.recording){
      recorder.stop()
    }else{
      recorder.start()
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
  function playPausePlayback(id?: number){
    if (player.state === 'play'){
      player.pause()
      props.setRecorderStep('none')
    }else if(player.state === 'stop'){
      if (id){
        const record = records?.find(r => r.id === id)
        if (record && record.blob){
          props.setRecorderStep('none')
          player.load(record.blob, record.title, true).then(()=>{
            player.play()
          })
        }
      }else{
        player.play()
      }
    }else if (player.state === 'pause'){
      player.play()
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
          playPausePlayback()
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

  return (
    <>
    <TextField label="Start time" type="text" style={{}}
      value={startTime} onChange={(ev)=>{ setStartTime(ev.currentTarget.value) }} />
    <List>
      <DialogIconItem
        key="record" text={t(recorder.recording ? 'recorderStop' : 'recorderStart')}
          icon={recorder.recording ? <StopIcon /> : <RecordIcon /> }
          onClick={startStopRecord}
      />
      {player.state==='play' ? undefined : <>
        <input type="file" accept="application/octet-stream" ref={fileToPlay} style={{display:'none'}}
          onChange={ (ev) => {
            const files = ev.currentTarget?.files
            if (files && files.length) {
              props.setRecorderStep('none')
              player.load(files[0], files[0].name, true).then(()=>{
                player.seek(Number(startTime))
                player.play()
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
        if (player.state==='play'){
          return <DialogIconItem
            key="stopPlay" text={t('playerStop')}
            icon={<StopIcon />}
            onClick={playPausePlayback}
          />
        }else{
          return null
        }
      }}</Observer>
      {!recorder.recording && records?.map((r)=>{
        const duration = timeToHourMinSec(r.duration)
        return <DialogItem
          key={r.id}
          icon = {<><IconButton size='small' onClick={()=>r.id && deleteRecord(r.id)}><DeleteIcon /></IconButton> </>}
          plain={<>
            <span style={{display:'inline-block', width :'24em'}}>{r.title}</span>
            <span style={{display:'inline-block', width :'4em'}}>{duration}</span>
            &nbsp;&nbsp;
            <IconButton size='small' onClick={() => {
              if (r.id){
                const rec = records.find(data => data.id === r.id)
                if (rec?.blob) {
                  player.load(rec.blob, rec.title, false).then(()=>{
                    props.setRecorderStep('infoFromMenu')
                  })
                }
              }
            }}>
              <InfoIcon/>
            </IconButton>
            &nbsp;&nbsp;
            <IconButton size='small' onClick={()=>r.id && playPausePlayback(r.id)}><PlayIcon /></IconButton>
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
