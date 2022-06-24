import {MSTrack} from '@models/utils'

export class AudioMeter{
  context?: AudioContext
  analyser?: AnalyserNode
  source?: MediaStreamAudioSourceNode
  private BUFFERLEN = 32
  setSource(track?: MSTrack){
    //  close previous graph
    this.source?.disconnect()
    this.analyser?.disconnect()
    this.context?.close()
    this.source = undefined
    this.analyser = undefined
    this.context = undefined
    //  create new graph
    if (track){
      this.context = new AudioContext();
      this.analyser = this.context.createAnalyser();
      this.source = this.context.createMediaStreamSource(new MediaStream([track.track]));
      if (this.analyser && this.source){
        this.source.connect(this.analyser)
        //  Never connect to destination. It will output the sound.
        //  this.analyser.connect(this.context.destination)
        this.analyser.fftSize = this.BUFFERLEN
      }
    }
  }
  getAudioLevel(){
    if (!this.context) return 0
    if (this.context.state === 'suspended') {
      this.context.resume();
    }
    const buffer = new Float32Array(this.BUFFERLEN)
    this.analyser?.getFloatTimeDomainData(buffer)
    const volume = buffer.reduce((prev, cur)=>prev+Math.abs(cur), 0) / this.BUFFERLEN
    //  console.log(`local audio level ${volume}`)
    return volume
  }
}

