//  Drives server-side speech-to-text from the client: asks the media server to transcribe our own
//  mic producer while STT is on and the mic is live, and tells the room which language we want
//  subtitles in. Recognition itself happens on the server (bm workspace doc: `stt-translation`),
//  so there is no audio handling here at all.
//
//  Sits in models/ rather than stores/ for the same reason models/recorder does: it needs both
//  `conference` and the stores, and `architecture#arch` forbids stores from importing conference.
import {conference} from '@models/conference'
import {action, autorun, IReactionDisposer, makeObservable, observable} from 'mobx'
import participants from '@stores/participants/Participants'
import roomInfo from '@stores/room/RoomInfo'
import settings from '@stores/room/Settings'
import transcript from '@stores/room/Transcript'

class SttClient{
  private disposers: IReactionDisposer[] = []
  private started = false
  private startedLang = ''
  private startedProducer = ''
  private watchTimer = 0
  private sentLanguages = ''
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
      //  The room decides whether anything is transcribed; a participant's own switch only
      //  decides whether they look at the result. Muting still stops transcription outright --
      //  "muted but still subtitled" is a privacy failure, not a display preference -- so it is
      //  a condition of this one start/stop decision.
      const wanted = roomInfo.stt && !local.muteAudio && !!conference.getLocalMicTrack()
      const lang = settings.sttSpeak || 'auto'
      if (wanted && (!this.started || this.startedLang !== lang)){
        this.doStart(lang)
      }else if (!wanted && this.started){
        this.doStop()
      }
    }))

    //  A media-server restart or an RTC reconnect gives us a new producer, and the session the
    //  server was transcribing is gone with the old one. Nothing observable changes when that
    //  happens -- getLocalMicTrack() is a plain field -- so the only honest check is to look.
    this.watchTimer = window.setInterval(() => this.ensureStarted(), 5000)

    //  Re-announce the languages when the user changes them mid-meeting. The announcement on
    //  joining is DataSync.sendAllAboutMe()'s job -- this autorun cannot do it, because whether
    //  the data connection is up is not observable, so its first run (during enter(), before the
    //  connection exists) would be its last.
    this.disposers.push(autorun(() => {
      const languages = `${settings.sttSpeak}|${settings.sttShow}`
      if (languages === this.sentLanguages || !conference.dataConnection.isConnected()){ return }
      this.sentLanguages = languages
      conference.dataConnection.sync.sendSttLang()
    }))
  }

  @action private onStarted(error: string|undefined){
    this.lastError = error || ''
    if (!error){ return }
    //  The server refused. The room's switch is left alone -- it is everyone's, and the refusal
    //  is the same for everyone -- but this client stops claiming a session it does not have,
    //  and the footer says why nothing is appearing.
    this.started = false
    console.warn(`stt: server refused: ${error}`)
  }

  private ensureStarted(){
    if (!roomInfo.stt || participants.local.muteAudio){ return }
    const producer = conference.rtcTransports.getLocalProducer('avatar', 'audio')
    if (!producer || (this.started && this.startedProducer === producer.id)){ return }
    this.doStart(this.startedLang || settings.sttSpeak || 'auto')
  }

  private doStart(lang: string){
    const producer = conference.rtcTransports.getLocalProducer('avatar', 'audio')
    if (!producer){ return }
    conference.rtcTransports.sttStart(conference.room, [producer], lang)
    this.started = true
    this.startedLang = lang
    this.startedProducer = producer.id
  }

  private doStop(){
    conference.rtcTransports.sttStop(conference.room)
    this.started = false
    this.startedLang = ''
    this.startedProducer = ''
  }

  //  Leaving the room ends the session server-side anyway (the peer is gone); this only keeps
  //  local state from claiming a session that no longer exists.
  stop(){
    if (this.watchTimer){ window.clearInterval(this.watchTimer); this.watchTimer = 0 }
    this.disposers.forEach(d => d())
    this.disposers = []
    this.started = false
    this.startedLang = ''
    this.startedProducer = ''
    this.sentLanguages = ''
    transcript.clear()
  }
}

export const sttClient = new SttClient()
declare const d:any
d.sttClient = sttClient
