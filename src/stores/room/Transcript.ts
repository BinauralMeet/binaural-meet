//  Speech-to-text results for the room: what was said, by whom, and its translations.
//  Recognition and translation both happen on the server (see the bm workspace doc
//  `stt-translation`); this store only holds what arrives and answers "what should this
//  participant's subtitle say right now".
//
//  Layer rule (architecture#arch): stores must not import @models/conference. The type-only
//  import below is the documented exception -- these payload shapes are the wire format, and
//  duplicating them here would just let the two drift.
import type {SpeechInterim, SpeechText, SpeechTranslation} from '@models/conference/DataMessageType'
import {action, makeObservable, observable} from 'mobx'

//  How long a finished utterance keeps showing next to the avatar. Long enough to read a short
//  sentence, short enough that a silent participant is not left with a stale bubble.
export const BUBBLE_LINGER_MS = 4000
const UTTERANCES_MAX = 1000

export class Utterance{
  readonly sid: string
  readonly pid: string
  readonly startTime: number
  @observable lang: string
  @observable text: string
  @observable final = false
  //  Filled in later than the text: the server sends translations as a separate message so a
  //  slow translator cannot delay the original subtitle.
  @observable translations = observable.map<string, string>()
  @observable endTime = 0

  constructor(sid: string, pid: string, text: string, lang: string, startTime: number){
    this.sid = sid
    this.pid = pid
    this.text = text
    this.lang = lang
    this.startTime = startTime
    makeObservable(this)
  }
}

export class Transcript{
  @observable.shallow utterances: Utterance[] = []
  //  pid -> that participant's most recent utterance, for the speech bubble.
  @observable.shallow latest = observable.map<string, Utterance>()
  private bySid = new Map<string, Utterance>()

  constructor(){
    makeObservable(this)
  }

  private touch(sid: string, pid: string, text: string, lang: string){
    let utterance = this.bySid.get(sid)
    if (!utterance){
      utterance = new Utterance(sid, pid, text, lang, Date.now())
      this.bySid.set(sid, utterance)
      this.utterances.push(utterance)
      this.limit()
    }
    this.latest.set(pid, utterance)

    return utterance
  }

  private limit(){
    if (this.utterances.length <= UTTERANCES_MAX){ return }
    const dropped = this.utterances.splice(0, this.utterances.length - UTTERANCES_MAX)
    //  Keep the sid index from growing without bound along with the array it indexes.
    dropped.forEach(u => this.bySid.delete(u.sid))
  }

  //  A provisional hypothesis for an utterance still being spoken. Each one replaces the last.
  @action onInterim(pid: string|undefined, payload: SpeechInterim){
    if (!pid){ return }
    const utterance = this.touch(payload.sid, pid, payload.text, payload.lang)
    if (utterance.final){ return }    //  a late interim must not overwrite the final text
    utterance.text = payload.text
    utterance.lang = payload.lang
  }

  @action onFinal(pid: string|undefined, payload: SpeechText){
    if (!pid){ return }
    const utterance = this.touch(payload.sid, pid, payload.text, payload.lang)
    utterance.text = payload.text
    utterance.lang = payload.lang
    utterance.final = true
    utterance.endTime = payload.ts || Date.now()
  }

  @action onTranslation(payload: SpeechTranslation){
    //  Arrives after the final text; if that utterance has already been dropped there is
    //  nothing to attach it to.
    const utterance = this.bySid.get(payload.sid)
    if (!utterance){ return }
    for (const lang of Object.keys(payload.texts)){
      utterance.translations.set(lang, payload.texts[lang])
    }
  }

  //  What to display: the translation into the reader's language when there is one, otherwise
  //  the original. A participant reading in the language it was spoken in sees the original.
  textFor(utterance: Utterance, showLang: string){
    if (!showLang){ return utterance.text }
    const primary = showLang.split(/[-_]/)[0].toLowerCase()
    if (primary === utterance.lang.split(/[-_]/)[0].toLowerCase()){ return utterance.text }

    return utterance.translations.get(primary) ?? utterance.text
  }

  //  The bubble shows an utterance while it is being spoken and for a moment afterwards.
  bubbleOf(pid: string, now: number){
    const utterance = this.latest.get(pid)
    if (!utterance){ return undefined }
    if (!utterance.final){ return utterance }

    return now - utterance.endTime < BUBBLE_LINGER_MS ? utterance : undefined
  }

  @action clear(){
    this.utterances = []
    this.latest.clear()
    this.bySid.clear()
  }
}

const transcript = new Transcript()
declare const d:any
d.transcript = transcript
export default transcript
