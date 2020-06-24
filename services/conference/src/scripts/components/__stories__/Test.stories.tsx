import React, {useEffect, useRef} from 'react'

export default {
  title: 'Test',
}

export const test = () => {
  const parent = useRef<HTMLDivElement | null>(null)
  const child = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    parent?.current?.addEventListener('click', callbackFactory('DOM click parent'))
  },        [parent])

  useEffect(() => {
    child?.current?.addEventListener('click', callbackFactory('DOM click child'))
  },        [child])

  return <div id="parent" onClick={callbackFactory('react click parent')} ref={parent}>
    <div id="child" onClick={callbackFactory('react click child')} ref={child}> hello </div>
  </div>
}

function callbackFactory(message: string) {
  return () => {
    console.log(message)
  }
}
