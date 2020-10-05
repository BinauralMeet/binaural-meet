import React, {useRef} from 'react'
import {memoObject} from './memoObject'

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
  interval?: number
  handle?: string  //  class name of dragging handle
  target: React.RefObject<ET>
  memo: DragMemo<ET>

  constructor(onDrag:(state:DragState<ET>) => void, handle?: string,
              onTimer?:(state:DragState<ET>) => boolean, interval?: number) {
    this.interval = interval
    this.onDrag = onDrag
    this.onTimer = onTimer
    this.handle = handle
    this.target = useRef<ET>(null)
    this.memo = memoObject<DragMemo<ET>>()
  }
  timerFunc = () => {
    if (!this.memo.state.dragging && !this.memo.timerAgain) {
      clearInterval(this.memo.timerId)
      this.memo.timerId = 0
    }else if (this.onTimer) {
      this.memo.timerAgain = this.onTimer(this.memo.state)
    }
  }

  bind() {

    const bindObject = {
      onMouseDown: (e: React.MouseEvent<ET>) => {
        e.stopPropagation()
      },
      onPointerDown : (e: React.PointerEvent<ET>) => {
        e.stopPropagation()
        this.memo.state = {dragging:false, buttons:e.buttons, xy:[e.clientX, e.clientY], event:e}
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
        this.memo.state = {dragging:false, buttons:e.buttons, xy:[e.clientX, e.clientY], event:e}
        //  console.log(`onPointerOut: ${this.memo.state.dragging}`)
      },
      onPointerUp: (e: React.PointerEvent<ET>) => {
        bindObject.onPointerOut(e)
      },
      onPointerMove: (e: React.PointerEvent<ET>) => {
        e.stopPropagation()
        this.memo.state = {dragging:this.memo.state?.dragging ? true :false,
          buttons:e.buttons, xy:[e.clientX, e.clientY], event:e}
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

