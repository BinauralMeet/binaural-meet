import React, {Dispatch, SetStateAction, useRef, useState} from 'react'

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
  xy: [number, number]
  event:React.PointerEvent<ET>|undefined
}

export class DragHandler<ET extends Element>{  //  pointer drag
  onDrag: (state:DragState<ET>) => void
  onTimer?: () => void
  interval?: number
  handle?: string  //  class name of dragging handle
  xy: [number, number]
  setXy: Dispatch<SetStateAction<[number, number]>>
  dragging: number
  setDragging: Dispatch<SetStateAction<number>>
  target: React.RefObject<ET>

  constructor(onDrag:(state:DragState<ET>) => void, handle?: string, onTimer?:() => void, interval?: number) {
    this.interval = interval
    this.onDrag = onDrag
    this.onTimer = onTimer
    this.handle = handle;
    [this.xy, this.setXy] = useState([0, 0]);
    [this.dragging, this.setDragging] = useState<number>(0)
    this.target = useRef<ET>(null)
  }
  timerFunc = () => {
    if (this.onTimer) { this.onTimer() }
  }

  bind() {

    return {
      onMouseDown: (e: React.MouseEvent<ET>) => {
        e.stopPropagation()
      },
      onPointerDown : (e: React.PointerEvent<ET>) => {
        e.stopPropagation()
        //  console.log(`onPointerDown xy:${e.clientX},${e.clientY} buttons:${e.buttons}`)
        if ((e.buttons & 1) && this.target.current &&
          (!this.handle || checkClass(e.target as Element, this.target.current, this.handle))) {
          (e.target as Element).setPointerCapture(e.pointerId)

          const intervalId = setInterval(this.timerFunc, this.interval)
          this.setDragging(intervalId)
          this.setXy([e.clientX, e.clientY])
        }
      },
      onPointerUp: (e: React.PointerEvent<ET>) => {
        e.stopPropagation()
        if (this.dragging) {
          clearInterval(this.dragging)
          this.setDragging(0)
        }
      },
      onPointerMove: (e: React.PointerEvent<ET>) => {
        e.stopPropagation()
        //  console.log(`onPointerMove xy:${e.clientX},${e.clientY} buttons:${e.buttons} drag:${this.dragging ? 1 : 0}`)
        this.setXy([e.clientX, e.clientY])

        if (this.dragging) {
          if ((e.buttons & 1)) {
            this.onDrag({xy:this.xy, event:e})
          }else {
            clearInterval(this.dragging)
            this.setDragging(0)
          }
        }
      },
    }
  }
}

