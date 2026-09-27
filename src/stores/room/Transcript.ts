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

//  How long a finished utterance keeps showing next to the avatar. Reading takes time
//  proportional to the text, so a fixed delay either rushes a long sentence or leaves a stale
//  bubble after a short one. ~10 characters per second is comfortable for subtitles in both
//  Japanese and English; the floor covers interjections, the ceiling stops one sentence from
//  parking itself over the map.
const BUBBLE_BASE_MS = 2500
const BUBBLE_MS_PER_CHAR = 140
const BUBBLE_MAX_MS = 25000

//  Silence shorter than this leaves the bubble alone: the utterances around it are one stretch
//  of speech shown as one growing bubble. Longer than the VAD's own hangover (500ms), which cuts
//  on any short pause -- breathing between clauses must not split the bubble the way it splits
//  the transcript. Measured in *speech* time (ts/durationMs, stamped by the server when the
//  speaking stopped), never in arrival time: recognition lags speech by seconds and by a varying
//  amount, so arrival gaps say nothing about whether the speaker paused.
const BUBBLE_RUN_GAP_MS = 2500

//  A run stops growing at this many characters: past it, whole utterances drop off the front.
//  Someone talking for a minute straight should not end up with a wall of text over their avatar.
const BUBBLE_MAX_CHARS = 140

const UTTERANCES_MAX = 1000

//  Did `next` start soon enough after `prev` ended to count as the same stretch of speech?
//  Both times come from the same server clock, so the comparison is safe across machines; when
//  the server did not say (older recordings), fall back to when this client saw them.
export function isSameRun(prev: Utterance, next: Utterance){
  if (prev.ts && next.ts && next.durationMs){
    return next.ts - next.durationMs - prev.ts <= BUBBLE_RUN_GAP_MS
  }

  return next.startTime - prev.endTime <= BUBBLE_RUN_GAP_MS
}

export function bubbleDurationMs(text: string){
  return Math.min(BUBBLE_BASE_MS + text.length * BUBBLE_MS_PER_CHAR, BUBBLE_MAX_MS)
}

//  What the bubble shows: the run of utterances joined, whether it ends in provisional text, and
//  whether any part of it wanted a translation that never came (dropped by the backend as
//  low-confidence, or simply unavailable) and is showing the original language instead -- that
//  reads very differently from an actual translation, so the caller styles it differently too.
export interface Bubble{
  text: string
  provisional: boolean
  untranslated: boolean
}

export class Utterance{
  readonly sid: string
  readonly pid: string
  readonly startTime: number    //  local clock: when this client first saw the utterance
  //  Speech time, from the server. Absent until the utterance is final.
  @observable ts = 0
  @observable durationMs = 0
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
    utterance.ts = payload.ts || 0
    utterance.durationMs = payload.durationMs || 0
    //  Local clock, not payload.ts: startTime is local too, and both drive how long the bubble
    //  stays up and whether two utterances are one stretch of speech. Mixing in the server's
    //  clock would make those decisions wrong by however far the two clocks have drifted.
    //  payload.ts is what the chat line timestamps itself with -- that is a different question.
    utterance.endTime = Date.now()
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
  //  the original. A participant reading in the language it was spoken in sees the original --
  //  that is a normal, fully-expected case, not the "wanted a translation and didn't get one"
  //  case `wantedTranslation` reports below.
  textFor(utterance: Utterance, showLang: string){
    if (!showLang){ return utterance.text }
    const primary = showLang.split(/[-_]/)[0].toLowerCase()
    if (primary === utterance.lang.split(/[-_]/)[0].toLowerCase()){ return utterance.text }

    return utterance.translations.get(primary) ?? utterance.text
  }

  //  True when this utterance is in a language the reader did not ask for, and no translation
  //  into their language has arrived (yet, or ever -- the two look the same to the reader, who
  //  just sees original-language text where a translation was expected).
  private wantedTranslation(utterance: Utterance, showLang: string){
    if (!showLang){ return false }
    const primary = showLang.split(/[-_]/)[0].toLowerCase()
    if (primary === utterance.lang.split(/[-_]/)[0].toLowerCase()){ return false }

    return !utterance.translations.has(primary)
  }

  //  The bubble shows everything this participant has said in one continuous stretch, so it
  //  grows while they keep talking, and stays up afterwards for as long as it takes to read.
  bubbleOf(pid: string, now: number, showLang = ''): Bubble|undefined{
    const last = this.latest.get(pid)
    if (!last){ return undefined }

    //  Walk back over the run: each utterance that began soon after the previous one ended is
    //  part of the same stretch of speech.
    const run: Utterance[] = []
    let index = this.utterances.lastIndexOf(last)
    let earliest = last
    while (index >= 0){
      const utterance = this.utterances[index]
      if (utterance.pid !== pid){ index -= 1; continue }
      if (utterance !== last && !isSameRun(utterance, earliest)){ break }
      run.unshift(utterance)
      earliest = utterance
      index -= 1
    }

    //  Still being spoken: no expiry, and the provisional tail is marked as such.
    if (!last.final){
      const {text, untranslated} = this.joinRun(run, showLang)

      return {text, provisional: true, untranslated}
    }
    const {text, untranslated} = this.joinRun(run, showLang)
    if (now - last.endTime >= bubbleDurationMs(text)){ return undefined }

    return {text, provisional: false, untranslated}
  }

  private joinRun(run: Utterance[], showLang: string){
    const texts = run.map(u => this.textFor(u, showLang)).filter(t => t)
    //  Drop from the front rather than truncating mid-word: the most recent words matter most.
    while (texts.length > 1 && texts.join(' ').length > BUBBLE_MAX_CHARS){ texts.shift() }
    //  One untranslated segment is enough to flag the whole bubble: a bubble that is half a real
    //  translation and half a same-looking original would be more confusing distinguished than not.
    const untranslated = run.some(u => this.wantedTranslation(u, showLang))

    return {text: texts.join(' '), untranslated}
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
