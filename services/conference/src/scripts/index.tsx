import {App} from '@components/app'
import React from 'react'
import ReactDOM from 'react-dom'

function component() {
  const element = document.createElement('div')

  element.innerHTML = 'Hello webpack'

  return element
}

document.body.appendChild(component())

const root = document.querySelector('#root')
ReactDOM.render(<App />, root)
