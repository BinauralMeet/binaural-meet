const NOTE_FREQ = 440
export class AudioSource {
  context = new AudioContext()
  oscillator = this.context.createOscillator()
  destination = this.context.createMediaStreamDestination()

  constructor() {
    this.oscillator.type = 'sawtooth'
    this.oscillator.frequency.value = NOTE_FREQ
    this.oscillator.start()

    this.oscillator.connect(this.destination)
  }

  get stream() {
    return this.destination.stream
  }
}
