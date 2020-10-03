import {useStore as useMapStore} from '@hooks/MapStore'
import {SharedContent as ISharedContent} from '@models/SharedContent'
import {createContentOfIframe, createContentOfImage, createContentOfText, SharedContent} from '@stores/sharedContents/SharedContent'
import {default as sharedContents} from '@stores/sharedContents/SharedContents'
import _ from 'lodash'
import {useObserver} from 'mobx-react-lite'
import React, {useEffect} from 'react'
import {RndContent} from './RndContent'

export interface PastedContentProps{
  content?:ISharedContent
}

const SHARE_DIRECT = true
export const PastedContent: React.FC<PastedContentProps> = (props:PastedContentProps) => {
  const map = useMapStore()
  //  Pasted handler. It prevents paste to dialog.
  function onPaste(evt: ClipboardEvent) {
    //  console.log(`onPaste called enabled:${sharedContents.pasteEnabled}`)
    if (sharedContents.pasteEnabled && evt.clipboardData) {
      evt.preventDefault()
      if (evt.clipboardData.types.includes('Files')) {   //  If file is pasted (an image is also a file)
        const imageFile = evt.clipboardData.items[0].getAsFile()
        if (imageFile) {
          createContentOfImage(imageFile, map).then((content) => {
            if (SHARE_DIRECT) {
              sharedContents.shareContent(content)
            } else {
              sharedContents.setPasted(content)
            }
          })
        }
      }else if (evt.clipboardData.types.includes('text/plain')) {
        evt.clipboardData.items[0].getAsString((str:string) => {
          let content = undefined
          if (str.indexOf('http://') === 0 || str.indexOf('https://') === 0) {
            content = createContentOfIframe(str, map)
          } else {
            content = createContentOfText(str, map)
          }
          if (SHARE_DIRECT) {
            sharedContents.shareContent(content)
          } else {
            sharedContents.setPasted(content)
          }
        })
      }
    }
  }
  function onShare() {
    // console.log("onClick b:", evt.button, " bs:" ,evt.buttons, " d:", evt.detail, " p:", evt.eventPhase)
    //  Add the pasted content to sharedContents and clear the pastedContent.
    const TIME_RESOLUTION_IN_MS = 100
    pastedContent.zorder = Math.floor(Date.now() / TIME_RESOLUTION_IN_MS)
    pastedContent.pinned = true
    sharedContents.addLocalContent(_.cloneDeep(pastedContent))
    sharedContents.setPasted(new SharedContent)
  }

  useEffect(
    () => {
      window.document.body.addEventListener(
        'paste',
        (event) => {
          onPaste(event)
        },
        {passive:false},
      )
    },
    [],
  )
  const pastedContent = useObserver(() => sharedContents.pasted)
  //  console.log('Pasted contents rendered.')

  return (
    <RndContent content={pastedContent} hideAll={pastedContent.type === ''}
      onShare = {(evt: React.MouseEvent<HTMLDivElement>) => { onShare() }}
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
