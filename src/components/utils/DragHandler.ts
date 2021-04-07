import {normV, subV2} from '@models/utils'
import React, {useEffect, useRef} from 'react'

function checkClass<ET extends Element>(el: Element, stop:ET, clsToFind: string):Element | null {
  let cur = el
  while (cur && cur !== stop) {
    if (cur.attributes) {
      const cls = cur.attributes.getNamedItem('class')
      if (cls) {
        if (cls.value.includes(clsToFind)) {
          return cur
        }
        //  console.log(cls.value)
      }
    }
    cur = cur.parentNode as Element
  }

  return null
}

export interface DragState<ET extends Element>{
  buttons: number
  xy: [number, number]
  start: [number, number]
  startTime: number
  dragging: boolean
  event:React.PointerEvent<ET>|undefined
}
interface DragMemo<ET extends Element>{
  timerAgain:boolean
  timerId: number
  state: DragState<ET>
}
/*
export class DragHandler<ET extends Element>{  //  pointer drag
  onDrag: (state:DragState<ET>) => void
  onTimer?: (state:DragState<ET>) => boolean
  onContextMenu?: (ev: React.TouchEvent<ET>) => void
  interval?: number
  handle?: string  //  class name of dragging handle
  target: React.RefObject<ET>
  memo: DragMemo<ET>
*/
export function DragHandler<ET extends Element>(onDrag:(state:DragState<ET>) => void, handle?: string,
              onTimer?:(state:DragState<ET>) => boolean, interval?: number,
              onContextMenu?:(ev: React.TouchEvent<ET>) => void) {
  const target = useRef<ET>(null)
  const memo = useRef<DragMemo<ET>>({state:{}} as DragMemo<ET>).current

  const timerFunc = () => {
    if (!memo.state.dragging && !memo.timerAgain) {
      clearInterval(memo.timerId)
      memo.timerId = 0
    }else if (onTimer) {
      memo.timerAgain = onTimer(memo.state)
    }
  }

  //  To prevent browser zoom, onTouchMove must call preventDefault() and need {passive:false}
  function onTouchMove(ev: Event) {
    ev.preventDefault()
    ev.stopPropagation()
  }

  useEffect(() => {
    const current = target.current
    current?.addEventListener('touchmove', onTouchMove, {passive:false})

    return () => {
      current?.removeEventListener('touchmove', onTouchMove)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },        [target.current])
  const bindObject = {
    target: target,
    onMouseDown: (e: React.MouseEvent<ET>) => { e.stopPropagation() },
    onTouchStart: (e: React.TouchEvent<ET>) => { e.stopPropagation() },
    onPointerDown: (e: React.PointerEvent<ET>) => {
      e.stopPropagation()
      memo.state = {dragging:false, buttons:e.buttons, xy:[e.clientX, e.clientY],
        start:[e.clientX, e.clientY], startTime:Date.now(), event:e}
      if ((e.buttons & 1) && target.current &&
        (!handle || checkClass(e.target as Element, target.current, handle))) {
        (e.target as Element).setPointerCapture(e.pointerId)

        if (!memo.timerId) {
          memo.timerId = setInterval(timerFunc, interval)
        }
        memo.state.dragging = true
      }
      //  console.log(`onPointerDown: ${this.memo.state.dragging}`)
    },
    onPointerOut: (e: React.PointerEvent<ET>) => {
      e.stopPropagation()
      Object.assign(memo.state, {dragging:false, buttons:e.buttons, xy:[e.clientX, e.clientY], event:e})
      //  console.log(`onPointerOut: ${this.memo.state.dragging}`)
    },
    onPointerUp: (e: React.PointerEvent<ET>) => {
      bindObject.onPointerOut(e)
    },
    onTouchEnd:(e: React.TouchEvent<ET>) => {
      e.stopPropagation()
      const delta = normV(subV2(memo.state.xy, memo.state.start))
      const deltaT = Date.now() - memo.state.startTime
      if (delta < 5 && deltaT > 0.5 && onContextMenu) {
        onContextMenu(e)
      }
    },
    onPointerMove: (e: React.PointerEvent<ET>) => {
      e.stopPropagation()
      Object.assign(memo.state, {dragging:memo.state?.dragging ? true :false,
        buttons:e.buttons, xy:[e.clientX, e.clientY], event:e})
      //  console.log(`onPointerMove xy:${e.clientX},${e.clientY} buttons:${e.buttons} drag:${this.dragging ? 1 : 0}`)

      if (memo.state.dragging) {
        if ((e.buttons & 1)) {
          onDrag(memo.state)
        }else {
          memo.state.dragging = false
        }
      }
    },
  }

  return bindObject
}
