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
      setContent(evt.clipboardData)
    }
  }
  function onDrop(evt: DragEvent) {
    //  console.log('onDrop', evt)
    evt.preventDefault()
    evt.stopPropagation()
    if (evt.dataTransfer) {
      setContent(evt.dataTransfer)
    }
  }
  function setContent(dataTransfer: DataTransfer) {
    if (dataTransfer?.types.includes('Files')) {   //  If file is pasted (an image is also a file)
      const imageFile = dataTransfer.items[0].getAsFile()
      if (imageFile) {
        createContentOfImage(imageFile, map).then((content) => {
          if (SHARE_DIRECT) {
            sharedContents.shareContent(content)
          } else {
            sharedContents.setPasted(content)
          }
        })
      }
    }else if (dataTransfer?.types.includes('text/plain')) {
      dataTransfer.items[0].getAsString((str:string) => {
        let content = undefined
        if (str.indexOf('http://') === 0 || str.indexOf('https://') === 0) {
          const url = new URL(str)
          if (url.host === location.host && url.pathname === location.pathname) {
            //  Openning of self url makes infinite loop. So, create text instead.
            content = createContentOfText(str, map)
          }else {
            content = createContentOfIframe(str, map)
          }
        } else {
          content = createContentOfText(str, map)
        }
        if (SHARE_DIRECT) {
          sharedContents.shareContent(content)
        } else {
          sharedContents.setPasted(content)
        }
      })
    }else {
      console.log('Drag type=', dataTransfer?.types)
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
      window.document.body.addEventListener(
        'drop',
        (event) => {
          onDrop(event)
        },
        {passive:false},
      )
      window.document.body.addEventListener(
        'dragover',
        (ev) => {
          // console.log('dragover called', ev)
          ev.preventDefault()
          ev.stopPropagation()
          if (ev.dataTransfer?.dropEffect) {
            ev.dataTransfer.dropEffect = 'copy'
          }
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
