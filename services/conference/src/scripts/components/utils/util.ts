import {EventEmitter} from 'events'
import React, {useEffect} from 'react'
export function addListenerToPreventDefault<T extends EventTarget>(targetRef:React.RefObject<T>, events: string[]) {
  useEffect(
    () => {
      const cb = (e: Event) => { e.preventDefault() }
      events.forEach(ev => targetRef.current?.addEventListener(ev, cb))

      return () => {
        events.forEach(ev => targetRef.current?.removeEventListener(ev, cb))
      }
    },
    [targetRef.current])
}
