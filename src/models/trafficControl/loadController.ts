const UPDATE_RATIO = 0.01
export class LoadController{
  remainAverage = 50
  period = 50
  periodAverage = 50
  constructor(){
    if ((window as any).requestIdleCallback){
      (window as any).requestIdleCallback((deadline:any) => this.onIdle(deadline))
    }
    /*
    setInterval(()=>{
      console.log(`Idle: ave:${this.averagedLoad} load:${this.instantLoad
        }  remain:${this.remainAverage} period:${this.period}`)
    }, 100)
    */
  }
  lastIdleCall = Date.now()
  get instantLoad(){
    const diff = Date.now() - this.lastIdleCall
    const lastPeriod = Math.max(diff, this.periodAverage)

    return Math.max(0, Math.min(1, 1 - (this.remainAverage / lastPeriod)))
  }
  get averagedLoad(){
    return Math.max(0, Math.min(1, 1 - (this.remainAverage / this.periodAverage)))
  }
  onIdle(deadline: any){
    (window as any).requestIdleCallback((deadline:any) => this.onIdle(deadline))
    const now = Date.now()
    this.period = now - this.lastIdleCall
    this.lastIdleCall = now
    this.periodAverage = this.periodAverage * (1-UPDATE_RATIO) + this.period * UPDATE_RATIO

    const remain = deadline.timeRemaining()
    if (remain){
      this.remainAverage = this.remainAverage * (1-UPDATE_RATIO) + remain * UPDATE_RATIO
    }
  }
}

export default new LoadController()