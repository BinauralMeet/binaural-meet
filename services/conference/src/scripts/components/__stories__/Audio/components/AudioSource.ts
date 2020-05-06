export class AudioSource {
  context = new AudioContext()
  oscillator = this.context.createOscillator()
  destination = this.context.createMediaStreamDestination()

  constructor() {
    this.oscillator.type = 'sawtooth'
    this.oscillator.frequency.value = 440
    this.oscillator.start()

    this.oscillator.connect(this.destination)
  }

  get stream() {
    return this.destination.stream
  }
}
