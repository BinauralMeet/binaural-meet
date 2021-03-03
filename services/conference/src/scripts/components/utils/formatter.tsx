import {assert} from '@models/utils'
import React from 'react'

export function acceleratorText2El(text:string) {
  const texts = text.split('_')
  assert(texts.length <= 2)

  return <>{texts[0]}{texts[1] ?
    <><strong>{texts[1].substr(0, 1)}</strong>{texts[1].substr(1)}</> : undefined}</>
}
