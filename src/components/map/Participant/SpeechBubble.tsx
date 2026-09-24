//  The subtitle bubble above an avatar: what this participant is saying right now, in the
//  language the local user reads. Fed by the Transcript store; recognition and translation both
//  happen on the server (bm workspace doc: `stt-translation`).
import {Observer} from 'mobx-react-lite'
import React from 'react'
import {BUBBLE_LINGER_MS} from '@stores/room/Transcript'
import {participants, settings, transcript} from '@stores/'
import {Z_INDEX} from '../../utils/styles'

const HALF = 0.5
const MAX_WIDTH = 260

export interface SpeechBubbleProps{
  pid: string
  size: number
}

function isAudible(pid: string){
  if (pid === participants.localId){ return true }
  const participant = participants.find(pid)
  if (!participant){ return false }
  const [cx, cy, r] = participants.audibleArea()
  const dx = participant.pose.position[0] - cx
  const dy = participant.pose.position[1] - cy

  return dx * dx + dy * dy <= r * r
}

export const SpeechBubble: React.FC<SpeechBubbleProps> = (props) => {
  //  A finished utterance disappears on a timer, and nothing else would re-render this component
  //  when that moment arrives -- so while one is showing, tick once to clear it.
  const [, setTick] = React.useState(0)
  React.useEffect(() => {
    const timer = window.setInterval(() => setTick(t => t + 1), 1000)

    return () => window.clearInterval(timer)
  }, [])

  return <Observer>{() => {
    const utterance = transcript.bubbleOf(props.pid, Date.now())
    if (!utterance){ return null }
    //  Subtitles follow the conversation you are actually in: text from across the room would
    //  clutter the map with speech you cannot hear. The chat pane still lists every utterance.
    if (!isAudible(props.pid)){ return null }
    const text = transcript.textFor(utterance, settings.sttShow)
    if (!text){ return null }

    return <div style={{
      position: 'absolute',
      left: 0,
      top: -(props.size * HALF + 6),
      transform: 'translate(-50%, -100%)',
      //  The participant's root div is 0x0 (it only positions things), so an absolutely
      //  positioned child resolves percentage/auto widths against zero and wraps into a
      //  one-character column. max-content sizes the bubble to its text instead.
      width: 'max-content',
      maxWidth: MAX_WIDTH,
      //  Long utterances must not turn into a wall of text over the map; two lines, then ellipsis.
      display: '-webkit-box',
      WebkitBoxOrient: 'vertical',
      WebkitLineClamp: 2,
      overflow: 'hidden',
      padding: '2px 8px',
      borderRadius: 8,
      //  Provisional text is dimmer than confirmed text, so a hypothesis that is about to be
      //  rewritten does not look like something the speaker definitely said.
      backgroundColor: utterance.final ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.65)',
      color: utterance.final ? 'black' : '#444',
      fontSize: 14,
      lineHeight: 1.25,
      whiteSpace: 'pre-wrap',
      wordBreak: 'break-word',
      pointerEvents: 'none',
      zIndex: Z_INDEX.participantLocal,
      boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
    }}>{text}</div>
  }}</Observer>
}
SpeechBubble.displayName = 'SpeechBubble'

export const SPEECH_BUBBLE_LINGER_MS = BUBBLE_LINGER_MS
