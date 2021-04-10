import {useEffect, useRef} from 'react'

export function KeyHandlerReact<ET extends Element> () {
  const keys = new Set<number>()
  const bindObject = {
    onKeyDown: (e: React.KeyboardEvent<ET>) => {
      e.stopPropagation()
      keys.add(e.keyCode)
      console.log('onKeyDown', keys)
    },
    onKeyUp: (e: React.KeyboardEvent<ET>) => {
      e.stopPropagation()
      keys.delete(e.keyCode)
      console.log('onKeyUp', keys)
    },
    onBlur:() => {
      keys.clear()
      console.log('onBlur', keys)
    },
  }
  return bindObject
}


type KeyHandlerPlain_OnTimer = (keys:Set<string>) => boolean

class KeyHandlerPlainState{
  timerId ?:number
  event?: KeyboardEvent
  keys = new Set<string>()
  timerAgain = false
}

export function KeyHandlerPlain(onTimer: KeyHandlerPlain_OnTimer, interval?:number,
  preventList?:Set<string>, stopList?:Set<string>, enabled?:() => boolean){
  const state = useRef<KeyHandlerPlainState>(new KeyHandlerPlainState()).current
  if (!interval) { interval = 33 }
  function timerFunc() {
    if (state.timerAgain || state.keys.size) {
      if (state.timerAgain || state.event?.target === document.body) {
        state.timerAgain = onTimer(state.keys)
      }
    }else {
      if (state.timerId) {
        clearInterval(state.timerId)
        state.timerId = undefined
      }
    }
  }

  const onKeyDown = (e: KeyboardEvent) => {
    if (enabled && !enabled()) { return }
    if (!preventList || preventList?.has(e.code)) { e.preventDefault() }
    if (!stopList || stopList?.has(e.code)) { e.stopPropagation() }
    state.event = e
    state.keys.add(e.code)
    //  console.log('onKeyDown', this.state.keys, e.target, e.target === document.body)
    if (!state.timerId && state.event.target === document.body) {
      state.timerId = setInterval(timerFunc, interval)
    }
  }
  const onKeyUp = (e: KeyboardEvent) => {
    if (enabled && !enabled()) { return }
    if (!preventList || preventList?.has(e.code)) { e.preventDefault() }
    if (!stopList || stopList?.has(e.code)) { e.stopPropagation() }
    state.event = e
    state.keys.delete(e.code)
    //  console.log('onKeyUp', this.state.keys, e.target)
  }
  const onBlur = () => {
    state.keys.clear()
    //  console.log('onBlur', this.state.keys)
  }

  useEffect(() => {
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onBlur)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },        [])
}
