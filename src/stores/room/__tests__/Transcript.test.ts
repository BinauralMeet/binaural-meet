import {describe, it, expect} from 'vitest'
import {Transcript, BUBBLE_LINGER_MS} from '../Transcript'

const SID = 'p1-1'

function interim(text: string, sid = SID){ return {sid, text, lang: 'ja'} }
function final(text: string, ts = 1000, sid = SID){ return {sid, text, lang: 'ja', ts} }

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

  it('shows a bubble while speaking and for a while after, then stops', () => {
    const transcript = new Transcript()
    transcript.onInterim('p1', interim('話し中'))
    //  An unfinished utterance shows however long it takes to say.
    expect(transcript.bubbleOf('p1', 1e12)?.text).toBe('話し中')

    transcript.onFinal('p1', final('話した。', 10000))
    expect(transcript.bubbleOf('p1', 10000 + BUBBLE_LINGER_MS - 1)?.text).toBe('話した。')
    expect(transcript.bubbleOf('p1', 10000 + BUBBLE_LINGER_MS)).toBeUndefined()
    expect(transcript.bubbleOf('nobody', 10000)).toBeUndefined()
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
