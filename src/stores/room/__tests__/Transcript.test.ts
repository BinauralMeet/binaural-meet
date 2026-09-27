import {describe, it, expect, vi, afterEach} from 'vitest'
import {Transcript, bubbleDurationMs} from '../Transcript'

const SID = 'p1-1'

function interim(text: string, sid = SID){ return {sid, text, lang: 'ja'} }

//  Bubble timing runs on the local clock (see onFinal), so drive it rather than passing
//  timestamps in the payload.
function at(ms: number){ vi.setSystemTime(ms) }
afterEach(() => { vi.useRealTimers() })
function final(text: string, ts = 1000, sid = SID){ return {sid, text, lang: 'ja', ts} }
//  A final as the server sends it: ts is when the speaking stopped, durationMs how long it took.
function spoken(text: string, ts: number, durationMs: number, sid = SID){
  return {sid, text, lang: 'ja', ts, durationMs}
}

describe('Transcript', () => {
  it('replaces the provisional text of an utterance as new hypotheses arrive', () => {
    const transcript = new Transcript()
    transcript.onInterim('p1', interim('こん'))
    transcript.onInterim('p1', interim('こんにちは'))
    expect(transcript.utterances).toHaveLength(1)
    expect(transcript.utterances[0].text).toBe('こんにちは')
    expect(transcript.utterances[0].final).toBe(false)
  })

  it('promotes the same utterance to final rather than adding a second one', () => {
    const transcript = new Transcript()
    transcript.onInterim('p1', interim('こん'))
    transcript.onFinal('p1', final('こんにちは。'))
    expect(transcript.utterances).toHaveLength(1)
    expect(transcript.utterances[0].text).toBe('こんにちは。')
    expect(transcript.utterances[0].final).toBe(true)
  })

  it('ignores an interim that arrives after the final text of the same utterance', () => {
    const transcript = new Transcript()
    transcript.onFinal('p1', final('こんにちは。'))
    transcript.onInterim('p1', interim('こんに'))
    expect(transcript.utterances[0].text).toBe('こんにちは。')
  })

  it('attaches a translation that arrives after the final text', () => {
    const transcript = new Transcript()
    transcript.onFinal('p1', final('こんにちは。'))
    transcript.onTranslation({sid: SID, pid: 'p1', texts: {en: 'Hello.'}})
    const utterance = transcript.utterances[0]
    expect(transcript.textFor(utterance, 'en')).toBe('Hello.')
    expect(transcript.textFor(utterance, 'en-US')).toBe('Hello.')
  })

  it('shows the original when the reader wants the language it was spoken in', () => {
    const transcript = new Transcript()
    transcript.onFinal('p1', final('こんにちは。'))
    transcript.onTranslation({sid: SID, pid: 'p1', texts: {en: 'Hello.'}})
    const utterance = transcript.utterances[0]
    expect(transcript.textFor(utterance, 'ja')).toBe('こんにちは。')
    expect(transcript.textFor(utterance, '')).toBe('こんにちは。')
    //  ...and when no translation into the wanted language exists.
    expect(transcript.textFor(utterance, 'ko')).toBe('こんにちは。')
  })

  it('drops a translation for an utterance it no longer has', () => {
    const transcript = new Transcript()
    expect(() => transcript.onTranslation({sid: 'gone', pid: 'p1', texts: {en: 'x'}})).not.toThrow()
    expect(transcript.utterances).toHaveLength(0)
  })

  it('keeps separate utterances per sid, and the latest one per participant', () => {
    const transcript = new Transcript()
    transcript.onFinal('p1', final('ひとつ', 1000, 'p1-1'))
    transcript.onFinal('p1', final('ふたつ', 2000, 'p1-2'))
    transcript.onFinal('p2', final('べつの人', 1500, 'p2-1'))
    expect(transcript.utterances).toHaveLength(3)
    expect(transcript.latest.get('p1')?.text).toBe('ふたつ')
    expect(transcript.latest.get('p2')?.text).toBe('べつの人')
  })

  it('shows a bubble while speaking and long enough to read it afterwards', () => {
    vi.useFakeTimers()
    const transcript = new Transcript()
    transcript.onInterim('p1', interim('話し中'))
    //  An unfinished utterance shows however long it takes to say, and is marked provisional.
    expect(transcript.bubbleOf('p1', 1e12))
      .toEqual({text: '話し中', provisional: true, untranslated: false})

    at(10000)
    transcript.onFinal('p1', final('話した。'))
    const shown = bubbleDurationMs('話した。')
    expect(transcript.bubbleOf('p1', 10000 + shown - 1))
      .toEqual({text: '話した。', provisional: false, untranslated: false})
    expect(transcript.bubbleOf('p1', 10000 + shown)).toBeUndefined()
    expect(transcript.bubbleOf('nobody', 10000)).toBeUndefined()
  })

  it('gives longer text more time to be read', () => {
    const short = bubbleDurationMs('はい')
    const long = bubbleDurationMs('あ'.repeat(60))
    expect(long).toBeGreaterThan(short)
    //  ...but neither vanishes instantly nor parks itself over the map forever.
    expect(short).toBeGreaterThanOrEqual(2500)
    expect(bubbleDurationMs('あ'.repeat(10000))).toBeLessThanOrEqual(25000)
  })

  it('grows the bubble while the speaker keeps going', () => {
    vi.useFakeTimers()
    const transcript = new Transcript()
    //  Recognition arrives seconds after the speech, and with varying lag -- the arrival times
    //  here are deliberately far apart to prove the run is judged on speech time instead.
    at(20000)
    transcript.onFinal('p1', spoken('ひとつ目。', 10000, 2000, 'p1-1'))
    at(26000)
    transcript.onFinal('p1', spoken('ふたつ目。', 13000, 2000, 'p1-2'))   //  spoken 1s later
    expect(transcript.bubbleOf('p1', 26000)?.text).toBe('ひとつ目。 ふたつ目。')
  })

  it('starts a new bubble after a real pause', () => {
    vi.useFakeTimers()
    const transcript = new Transcript()
    at(20000)
    transcript.onFinal('p1', spoken('前の話。', 10000, 2000, 'p1-1'))
    at(26000)
    transcript.onFinal('p1', spoken('別の話。', 20000, 2000, 'p1-2'))   //  8s of silence between
    expect(transcript.bubbleOf('p1', 26000)?.text).toBe('別の話。')
  })

  it('drops the oldest utterances once the run gets long', () => {
    vi.useFakeTimers()
    const transcript = new Transcript()
    for (let i = 0; i < 12; i += 1){
      at(10000 + i)
      transcript.onFinal('p1', spoken('あ'.repeat(20), 10000 + i * 2000, 2000, `p1-${i}`))
    }
    const text = transcript.bubbleOf('p1', 10012)!.text
    expect(text.length).toBeLessThanOrEqual(140 + 20)
    //  What survives is the most recent speech, not the start of the monologue.
    expect(text.endsWith('あ'.repeat(20))).toBe(true)
  })

  it('shows the run in the reader\'s language', () => {
    vi.useFakeTimers()
    const transcript = new Transcript()
    at(10000)
    transcript.onFinal('p1', spoken('ひとつ目。', 10000, 2000, 'p1-1'))
    at(11000)
    transcript.onFinal('p1', spoken('ふたつ目。', 12000, 2000, 'p1-2'))
    transcript.onTranslation({sid: 'p1-1', pid: 'p1', texts: {en: 'First.'}})
    transcript.onTranslation({sid: 'p1-2', pid: 'p1', texts: {en: 'Second.'}})
    const bubble = transcript.bubbleOf('p1', 11000, 'en')
    expect(bubble?.text).toBe('First. Second.')
    //  Both segments got a real translation, so nothing here fell back to the original.
    expect(bubble?.untranslated).toBe(false)
  })

  it('flags the bubble untranslated when a wanted translation never arrives', () => {
    vi.useFakeTimers()
    const transcript = new Transcript()
    at(10000)
    transcript.onFinal('p1', spoken('ひとつ目。', 10000, 2000, 'p1-1'))
    //  No onTranslation for this utterance -- e.g. dropped as low-confidence, or the service
    //  never answered. The reader still sees the original language, but the bubble says so.
    const bubble = transcript.bubbleOf('p1', 11000, 'en')
    expect(bubble?.text).toBe('ひとつ目。')
    expect(bubble?.untranslated).toBe(true)
  })

  it('is not untranslated when the reader wants the language it was spoken in', () => {
    vi.useFakeTimers()
    const transcript = new Transcript()
    at(10000)
    transcript.onFinal('p1', spoken('ひとつ目。', 10000, 2000, 'p1-1'))
    //  No translation exists at all, but none was needed: the reader reads Japanese.
    expect(transcript.bubbleOf('p1', 11000, 'ja')?.untranslated).toBe(false)
    expect(transcript.bubbleOf('p1', 11000, '')?.untranslated).toBe(false)
  })

  it('ignores results with no participant attached', () => {
    const transcript = new Transcript()
    transcript.onFinal(undefined, final('どこから?'))
    transcript.onInterim(undefined, interim('どこから?'))
    expect(transcript.utterances).toHaveLength(0)
  })

  it('clear() forgets everything, including the per-participant index', () => {
    const transcript = new Transcript()
    transcript.onFinal('p1', final('こんにちは。'))
    transcript.clear()
    expect(transcript.utterances).toHaveLength(0)
    expect(transcript.bubbleOf('p1', 1000)).toBeUndefined()
    //  A later translation for a forgotten utterance must not resurrect it.
    transcript.onTranslation({sid: SID, pid: 'p1', texts: {en: 'Hello.'}})
    expect(transcript.utterances).toHaveLength(0)
  })
})
