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

/*  //  Pasted handler. It prevents paste to dialog.
  function onPaste(evt: ClipboardEvent) {
    console.log('onPaste called')
    if (evt.clipboardData) {
      if (evt.clipboardData.types.includes('Files')) {   //  If file is pasted (an image is also a file)
        const imageFile = evt.clipboardData.items[0].getAsFile()
        if (imageFile) {
          sharedContents.setPastedImage(imageFile)
        }
      }else if (evt.clipboardData.types.includes('text/plain')) {
        evt.clipboardData.items[0].getAsString((str:string) => {
          if (str.indexOf('http://') === 0 || str.indexOf('https://') === 0) {
            sharedContents.setPastedIframe(str)
          }else {
            sharedContents.setPastedText(str)
          }
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
  */
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
