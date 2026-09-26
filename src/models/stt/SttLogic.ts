//  Pure rules behind the subtitle UI. No conference/store import, so they are unit-testable on
//  their own (same split as DataConnectionQueueLogic.ts, and SttVadLogic.ts on the server side).

//  Recognition is the room's, its display is each person's -- and one rule ties them together:
//  as soon as *anybody* has subtitles on, everybody is transcribed. The earlier design put a
//  separate room switch next to the display one, which made the ordinary case ("I want
//  subtitles") two steps and left a state -- room on, nobody looking -- that transcribed for no
//  reader.
export function anyoneWantsSubtitles(mine: boolean, remotes: {sttOn: boolean}[]): boolean{
  return mine || remotes.some(r => r.sttOn)
}
