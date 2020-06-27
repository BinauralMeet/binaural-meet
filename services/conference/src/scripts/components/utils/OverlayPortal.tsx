import {assert} from '@models/utils'
import React from 'react'
import ReactDOM from 'react-dom'

export const OverlayPortal: React.FC = (props) => {
  const domNode = document.querySelector('#overlay')
  assert(domNode !== null)

  return ReactDOM.createPortal(
    props.children,
    domNode,
  )
}
