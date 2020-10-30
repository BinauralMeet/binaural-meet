import {useStore as useMapStore} from '@hooks/MapStore'
import {SharedContent as ISharedContent} from '@models/SharedContent'
import {createContent, createContentOfIframe, createContentOfImage, createContentOfText} from '@stores/sharedContents/SharedContentCreator'
import {default as sharedContents} from '@stores/sharedContents/SharedContents'
import _ from 'lodash'
import {useObserver} from 'mobx-react-lite'
import React, {useEffect} from 'react'
import {RndContent} from './RndContent'

export interface PastedContentProps{
  content?:ISharedContent
}

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


  //  set pasted or dragged content to pasted content (not shared) or create shared content directly
  const SHARE_DIRECT = true
  function setContent(dataTransfer: DataTransfer) {
    if (dataTransfer?.types.includes('Files')) {   //  If file is pasted (an image is also a file)
      const imageFile = dataTransfer.items[0].getAsFile()
      if (imageFile) {
        createContentOfImage(imageFile, map).then((content) => {
          content.name = imageFile.name
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
            content.name = '! recursive reference'
          }else {
            content = createContentOfIframe(str, map)
            if (content.type === 'youtube') {
              content.name = `${url.search.substring(1)}`
            }else {
              content.name = `${url.host}${url.pathname}${url.search}`
            }
          }
        } else {
          content = createContentOfText(str, map)
          content.name = str.substring(0, 20)
        }
        if (SHARE_DIRECT) {
          sharedContents.shareContent(content)
        } else {
          sharedContents.setPasted(content)
        }
      })
    }else {
      console.error('Unhandled content types=', dataTransfer?.types)
    }
  }

  function onShare() {
    // console.log("onClick b:", evt.button, " bs:" ,evt.buttons, " d:", evt.detail, " p:", evt.eventPhase)
    //  Add the pasted content to sharedContents and clear the pastedContent.
    const TIME_RESOLUTION_IN_MS = 100
    pastedContent.zorder = Math.floor(Date.now() / TIME_RESOLUTION_IN_MS)
    pastedContent.pinned = true
    sharedContents.addLocalContent(_.cloneDeep(pastedContent))
    sharedContents.setPasted(createContent())
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
        sharedContents.setPasted(createContent())
        evt.stopPropagation()
      }}
      onUpdate = {(nc: ISharedContent) => {
        sharedContents.setPasted(nc)
      }}
    />
  )
}
