//  Drives server-side speech-to-text from the client: asks the media server to transcribe our own
//  mic producer while STT is on and the mic is live, and tells the room which language we want
//  subtitles in. Recognition itself happens on the server (bm workspace doc: `stt-translation`),
//  so there is no audio handling here at all.
//
//  Sits in models/ rather than stores/ for the same reason models/recorder does: it needs both
//  `conference` and the stores, and `architecture#arch` forbids stores from importing conference.
import {conference} from '@models/conference'
import {MessageType} from '@models/conference/DataMessageType'
import {action, autorun, IReactionDisposer, makeObservable, observable} from 'mobx'
import participants from '@stores/participants/Participants'
import settings from '@stores/room/Settings'
import transcript from '@stores/room/Transcript'

class SttClient{
  private disposers: IReactionDisposer[] = []
  private started = false
  private startedLang = ''
  //  Why STT is not running even though it was switched on (no backend configured, too many
  //  sessions, ...). The footer button shows it: a silently-dead feature is worse than a refusal.
  @observable lastError = ''

  constructor(){
    makeObservable(this)
  }

  start(){
    if (this.disposers.length){ return }
    conference.rtcTransports.addListener('sttStarted', (args: any[]) => {
      this.onStarted(Array.isArray(args) ? args[0] : args)
    })

    this.disposers.push(autorun(() => {
      const local = participants.local
      //  Muting must stop transcription, not merely stop sending audio: "muted but still
      //  subtitled" is a privacy failure, so it is a condition of this one start/stop decision.
      const wanted = settings.sttEnabled && !local.muteAudio && !!conference.getLocalMicTrack()
      const lang = settings.sttSpeak || 'auto'
      if (wanted && (!this.started || this.startedLang !== lang)){
        this.doStart(lang)
      }else if (!wanted && this.started){
        this.doStop()
      }
    }))

    //  What language we read is part of our participant state: the server collects it from
    //  everyone in the room to decide what to translate into.
    this.disposers.push(autorun(() => {
      const show = settings.sttShow || ''
      const speak = settings.sttSpeak || 'auto'
      if (!conference.dataConnection.isConnected()){ return }
      conference.dataConnection.sendMessage(MessageType.PARTICIPANT_STT_LANG, {speak, show})
    }))
  }

  @action private onStarted(error: string|undefined){
    this.lastError = error || ''
    if (!error){ return }
    //  The server refused. Turn the switch back off so its state matches reality.
    this.started = false
    settings.sttEnabled = false
    settings.save()
    console.warn(`stt: server refused: ${error}`)
  }

  private doStart(lang: string){
    const producer = conference.rtcTransports.getLocalProducer('avatar', 'audio')
    if (!producer){ return }
    conference.rtcTransports.sttStart(conference.room, [producer], lang)
    this.started = true
    this.startedLang = lang
  }

  private doStop(){
    conference.rtcTransports.sttStop(conference.room)
    this.started = false
    this.startedLang = ''
  }

  //  Leaving the room ends the session server-side anyway (the peer is gone); this only keeps
  //  local state from claiming a session that no longer exists.
  stop(){
    this.disposers.forEach(d => d())
    this.disposers = []
    this.started = false
    this.startedLang = ''
    transcript.clear()
  }
}

export const sttClient = new SttClient()
declare const d:any
d.sttClient = sttClient
