import * as Tone from 'tone'

// function runTone() {
//   const synth = new Tone.Synth()
//   const melodyNotes = [
//     'E5', 'C5', 'G4', 'C5', 'D5', 'G5', null, 'G4',
//     'D5', 'E5', 'D5', 'G4', 'C5', null, null, null, // nullは休符
//   ]


//   const melody = new Tone.Sequence(addMelody, melodyNotes, '8n')

//   const newDest = synth.context.createMediaStreamDestination()

//   synth.fan(newDest)

//   console.log(newDest.stream.getAudioTracks())

//   melody.start(0)
//   Tone.Transport.start()
// }

const melodyNotes1 = [
  'E5', 'C5', 'G4', 'C5', 'D5', 'G5', null, 'G4',
  'D5', 'E5', 'D5', 'G4', 'C5', null, null, null, // nullは休符
]

const noteArr = ['C3', 'D3', 'E3', 'F3', 'G3', 'A3', 'B3', 'C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4']

function randomNoteCollection() {
  const randomNote = () => noteArr[Math.floor(Math.random() * noteArr.length)]

  return [0, 0, 0, 0].map(randomNote)
}

const addMelody = (synth: Tone.PolySynth) => (time: any, note: any) => {
  synth.triggerAttackRelease(note, '1n', time)
}


class DummyAudio {
  private _synthes: Tone.PolySynth[]
  private _melodies: Tone.Pattern<string>[]
  private _destinations: MediaStreamAudioDestinationNode[]
  constructor() {
    this._synthes = []
    this._melodies = [
      // new Tone.Sequence(addMelody(this._synthes[0]), melodyNotes1, '8n'),
      // new Tone.Sequence(addMelody(this._synthes[1]), melodyNotes2, '8n'),

    ]
    this._destinations = []
  }

  public createNewStream(idx: number): MediaStream {
    const synth = new Tone.PolySynth()
    const pattern = new Tone.Pattern(addMelody(synth), randomNoteCollection(), 'upDown')
    // const melody = new Tone.Sequence(
    //   addMelody(synth), [['C4', 'E4', 'A4']], '8n',
    // )
    const dest = synth.context.createMediaStreamDestination()

    synth.set({
      volume : -4,
      oscillator : {
        type : 'triangle17',
        // 'partials' : [16, 8, 4, 2, 1, 0.5, 1, 2]
      },
      envelope : {
        attack : 0.01,
        decay : 0.1,
        sustain : 0.2,
        release : 1.7,
      },
    })

    this._synthes.push(synth)
    this._melodies.push(pattern)
    this._destinations.push(dest)


    synth.fan(dest)
    pattern.start()

    // Tone.Transport.start(0)
    return dest.stream
  }

  static start() {
    Tone.Transport.start(0)
  }

  static stop() {
    Tone.Transport.stop()
  }
}

export {DummyAudio}
