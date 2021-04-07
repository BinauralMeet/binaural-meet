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

export class DragHandler<ET extends Element>{  //  pointer drag
  onDrag: (state:DragState<ET>) => void
  onTimer?: (state:DragState<ET>) => boolean
  onContextMenu?: (ev: React.TouchEvent<ET>) => void
  interval?: number
  handle?: string  //  class name of dragging handle
  target: React.RefObject<ET>
  memo: DragMemo<ET>

  constructor(onDrag:(state:DragState<ET>) => void, handle?: string,
              onTimer?:(state:DragState<ET>) => boolean, interval?: number,
              onContextMenu?:(ev: React.TouchEvent<ET>) => void) {
    this.interval = interval
    this.onDrag = onDrag
    this.onTimer = onTimer
    this.handle = handle
    this.target = useRef<ET>(null)
    this.onContextMenu = onContextMenu
    this.memo = useRef<DragMemo<ET>>({state:{}} as DragMemo<ET>).current
  }
  timerFunc = () => {
    if (!this.memo.state.dragging && !this.memo.timerAgain) {
      clearInterval(this.memo.timerId)
      this.memo.timerId = 0
    }else if (this.onTimer) {
      this.memo.timerAgain = this.onTimer(this.memo.state)
    }
  }

  //  To prevent browser zoom, onTouchMove must call preventDefault() and need {passive:false}
  onTouchMove(ev: Event) {
    ev.preventDefault()
    ev.stopPropagation()
  }

  bind() {
    useEffect(() => {
      this.target.current?.addEventListener('touchmove', this.onTouchMove, {passive:false})

      return () => {
        this.target.current?.removeEventListener('touchmove', this.onTouchMove)
      }
    },        [this.target.current])
    const bindObject = {
      onMouseDown: (e: React.MouseEvent<ET>) => { e.stopPropagation() },
      onTouchStart: (e: React.TouchEvent<ET>) => { e.stopPropagation() },
      onPointerDown: (e: React.PointerEvent<ET>) => {
        e.stopPropagation()
        this.memo.state = {dragging:false, buttons:e.buttons, xy:[e.clientX, e.clientY],
          start:[e.clientX, e.clientY], startTime:Date.now(), event:e}
        if ((e.buttons & 1) && this.target.current &&
          (!this.handle || checkClass(e.target as Element, this.target.current, this.handle))) {
          (e.target as Element).setPointerCapture(e.pointerId)

          if (!this.memo.timerId) {
            this.memo.timerId = setInterval(this.timerFunc, this.interval)
          }
          this.memo.state.dragging = true
        }
        //  console.log(`onPointerDown: ${this.memo.state.dragging}`)
      },
      onPointerOut: (e: React.PointerEvent<ET>) => {
        e.stopPropagation()
        Object.assign(this.memo.state, {dragging:false, buttons:e.buttons, xy:[e.clientX, e.clientY], event:e})
        //  console.log(`onPointerOut: ${this.memo.state.dragging}`)
      },
      onPointerUp: (e: React.PointerEvent<ET>) => {
        bindObject.onPointerOut(e)
      },
      onTouchEnd:(e: React.TouchEvent<ET>) => {
        e.stopPropagation()
        const delta = normV(subV2(this.memo.state.xy, this.memo.state.start))
        const deltaT = Date.now() - this.memo.state.startTime
        if (delta < 5 && deltaT > 0.5 && this.onContextMenu) {
          this.onContextMenu(e)
        }
      },
      onPointerMove: (e: React.PointerEvent<ET>) => {
        e.stopPropagation()
        Object.assign(this.memo.state, {dragging:this.memo.state?.dragging ? true :false,
          buttons:e.buttons, xy:[e.clientX, e.clientY], event:e})
        //  console.log(`onPointerMove xy:${e.clientX},${e.clientY} buttons:${e.buttons} drag:${this.dragging ? 1 : 0}`)

        if (this.memo.state.dragging) {
          if ((e.buttons & 1)) {
            this.onDrag(this.memo.state)
          }else {
            this.memo.state.dragging = false
          }
        }
      },
    }

    return bindObject
  }
}

