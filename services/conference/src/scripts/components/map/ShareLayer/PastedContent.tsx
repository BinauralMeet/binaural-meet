import {uploadToGyazo} from '@models/api/Gyazo'
import {SharedContent as ISharedContent} from '@models/SharedContent'
import {SharedContent} from '@stores/sharedContents/SharedContent'
import {default as sharedContents} from '@stores/sharedContents/SharedContents'
import _ from 'lodash'
import {useObserver} from 'mobx-react-lite'
import React, {useEffect} from 'react'
import {RndContent} from './RndContent'

export interface PastedContentProps{
  content?:ISharedContent
}

export const PastedContent: React.FC<PastedContentProps> = (props:PastedContentProps) => {

  function onPaste(evt: ClipboardEvent) {
    console.log('onPaste called')
    if (evt.clipboardData) {
      const pasted = new SharedContent
      if (evt.clipboardData.types.includes('Files')) {   //  If file is pasted (an image is also a file)
        const imageFile = evt.clipboardData.items[0].getAsFile()
        if (imageFile) {
          sharedContents.setPastedImage(imageFile)
        }
      }else if (evt.clipboardData.types.includes('text/plain')) {
        evt.clipboardData.items[0].getAsString((str:string) => {
          pasted.url = str
          if (pasted.url.indexOf('http://') === 0 || pasted.url.indexOf('https://') === 0) {
            pasted.type = 'iframe'
            pasted.pose.position = (global as any).mousePositionOnMap
            const IFRAME_WIDTH = 600
            const IFRAME_HEIGHT = 800
            pasted.size[0] = IFRAME_WIDTH
            pasted.size[1] = IFRAME_HEIGHT
          }else {
            pasted.type = 'text'
            pasted.pose.position = (global as any).mousePositionOnMap
            const slen = Math.sqrt(str.length)
            const STRING_SCALE_W = 20
            const STRING_SCALE_H = 10
            pasted.size[0] = slen * STRING_SCALE_W
            pasted.size[1] = slen * STRING_SCALE_H
          }
          sharedContents.setPasted(pasted)
        })
      }
    }
  }
  useEffect(
    () => {
      window.document.body.addEventListener(
        'paste',
        (event) => {
          onPaste(event)
          event.preventDefault()
        },
        {passive:false},
      )
    },
    [],
  )
  const pastedContent = useObserver(() => sharedContents.pasted)

  return (
    <RndContent content={pastedContent} hideAll={pastedContent.type === ''}
      onShare = {(evt: React.MouseEvent<HTMLDivElement>) => {
        // console.log("onClick b:", evt.button, " bs:" ,evt.buttons, " d:", evt.detail, " p:", evt.eventPhase)
        //  Add the pasted content to sharedContents and clear the pastedContent.
        const TIME_RESOLUTION_IN_MS = 100
        pastedContent.zorder = Math.floor(Date.now() / TIME_RESOLUTION_IN_MS)
        sharedContents.addLocalContent(_.cloneDeep(pastedContent))
        sharedContents.setPasted(new SharedContent)
      }}
      onClose = {(evt: React.MouseEvent<HTMLDivElement>) => {
        sharedContents.setPasted(new SharedContent)
        evt.stopPropagation()
      }}
      onUpdate = {(nc: ISharedContent) => {
        sharedContents.setPasted(nc)
      }}
    />
  )
}
