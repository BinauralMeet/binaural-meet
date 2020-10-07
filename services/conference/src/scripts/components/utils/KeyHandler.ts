import {useEffect, useRef} from 'react'

export class KeyHandlerReact<ET extends Element>{
  keys = new Set<number>()
  bind() {
    const bindObject = {
      onKeyDown: (e: React.KeyboardEvent<ET>) => {
        e.stopPropagation()
        this.keys.add(e.keyCode)
        console.log('onKeyDown', this.keys)
      },
      onKeyUp: (e: React.KeyboardEvent<ET>) => {
        e.stopPropagation()
        this.keys.delete(e.keyCode)
        console.log('onKeyUp', this.keys)
      },
      onBlur:() => {
        this.keys.clear()
        console.log('onBlur', this.keys)
      },
    }

    return bindObject
  }
}


type KeyHandlerPlain_OnTimer = (keys:Set<string>) => boolean

class KeyHandlerPlainState{
  timerId ?:NodeJS.Timeout
  event?: KeyboardEvent
  keys = new Set<string>()
  timerAgain = false
}
export class KeyHandlerPlain{
  onTimer: KeyHandlerPlain_OnTimer
  interval = 33
  state: KeyHandlerPlainState
  constructor(onTimer: KeyHandlerPlain_OnTimer, interval?:number) {
    this.state = useRef<KeyHandlerPlainState>(new KeyHandlerPlainState()).current
    //  console.log('useRef:', this.state)

    this.onTimer = onTimer
    if (interval) { this.interval = interval }
    useEffect(() => {
      window.addEventListener('keydown', this.onKeyDown)
      window.addEventListener('keyup', this.onKeyUp)
      window.addEventListener('blur', this.onBlur)

      return () => {
        window.removeEventListener('keydown', this.onKeyDown)
        window.removeEventListener('keyup', this.onKeyUp)
        window.removeEventListener('blur', this.onBlur)
      }
    },        [])
  }
  timerFunc() {
    if (this.state.timerAgain || this.state.keys.size) {
      if (this.onTimer && (this.state.timerAgain || this.state.event?.target === document.body)) {
        this.state.timerAgain = this.onTimer(this.state.keys)
      }
    }else {
      if (this.state.timerId) {
        clearInterval(this.state.timerId)
        this.state.timerId = undefined
      }
    }
  }

  onKeyDown = (e: KeyboardEvent) => {
    e.stopPropagation()
    this.state.event = e
    this.state.keys.add(e.code)
    //  console.log('onKeyDown', this.state.keys, e.target, e.target === document.body)
    if (!this.state.timerId && this.state.event.target === document.body) {
      this.state.timerId = setInterval(this.timerFunc.bind(this), this.interval)
    }
  }
  onKeyUp = (e: KeyboardEvent) => {
    e.stopPropagation()
    this.state.event = e
    this.state.keys.delete(e.code)
    //  console.log('onKeyUp', this.state.keys, e.target)
  }
  onBlur = () => {
    this.state.keys.clear()
    //  console.log('onBlur', this.state.keys)
  }
}
