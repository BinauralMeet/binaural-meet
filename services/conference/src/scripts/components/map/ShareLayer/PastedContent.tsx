import {useStore as useMapStore} from '@hooks/MapStore'
import {useStore as useContents} from '@hooks/SharedContentsStore'
import {SharedContent, SharedContent as ISharedContent} from '@models/SharedContent'
import {MapData} from '@stores/Map'
import {createContent, createContentOfIframe, createContentOfImage, createContentOfImageUrl,
  createContentOfPdf, createContentOfText} from '@stores/sharedContents/SharedContentCreator'
import {default as sharedContents} from '@stores/sharedContents/SharedContents'
import _ from 'lodash'
import {useObserver} from 'mobx-react-lite'
import React, {useEffect} from 'react'
import {MouseOrTouch, RndContent} from './RndContent'

export interface PastedContentProps{
  content?:ISharedContent
}

export const PastedContent: React.FC<PastedContentProps> = (props:PastedContentProps) => {
  const map = useMapStore()
  //  Pasted handler. It prevents paste to dialog.
  function onPaste(evt: ClipboardEvent) {
    //  console.log(`onPaste called enabled:${sharedContents.pasteEnabled}`)
    if (sharedContents.pasteEnabled && map.keyInputUsers.size === 0 && evt.clipboardData) {
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
    if (dataTransfer?.types.includes('Files')) {   //  If file is pasted)
      Array.from(dataTransfer.items).forEach((item) => {
        const file = item.getAsFile()
        if (item.kind === 'file' && file) {
          let creator: ((file:File, map:MapData, offset?:[number, number]) => Promise<SharedContent>)
            | undefined = undefined
          if (item.type.indexOf('image') !== -1) {
            creator = createContentOfImage
          }else if (item.type === 'application/pdf') {
            creator = createContentOfPdf
          }
          if (creator) {
            creator(file, map).then((content) => {
              content.name = file.name
              if (SHARE_DIRECT) {
                sharedContents.shareContent(content)
              } else {
                sharedContents.setPasted(content)
              }
            })
          }
        }
      })
    }else if (dataTransfer?.types.includes('text/plain')) {
      dataTransfer.items[0].getAsString((str:string) => {
        let content = undefined
        if (str.indexOf('http://') === 0 || str.indexOf('https://') === 0) {
          const url = new URL(str)
          const ext = str.slice(-4)
          if (url.host === location.host && url.pathname === location.pathname) {
            //  Openning of self url makes infinite loop. So, create text instead.
            content = createContentOfText(str, map)
            content.name = '! recursive reference'
          }else if (ext === '.jpg' || ext === '.JPG' || ext === 'jpeg' || ext === 'JPEG' || ext === '.png' || ext === '.PNG') {
            createContentOfImageUrl(str, map).then((content) => {
              content.name = url.pathname
              if (SHARE_DIRECT) {
                sharedContents.shareContent(content)
              } else {
                sharedContents.setPasted(content)
              }
            })
          }else {
            content = createContentOfIframe(str, map)
            if (content.type === 'iframe') {
              //  iframe is not work well because of CORS problem.
              content = createContentOfText(str, map)
              content.name = `${url.host}${url.pathname}${url.search}`
            }
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
        if (content) {
          if (SHARE_DIRECT) {
            sharedContents.shareContent(content)
          } else {
            sharedContents.setPasted(content)
          }
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
  const contents = useContents()
  //  console.log('Pasted contents rendered.')

  return (
    <RndContent content={pastedContent} hideAll={pastedContent.type === ''}
      editing={props.content?.id === contents.editingId}
      onShare = {(evt: MouseOrTouch) => { onShare() }}
      onClose = {(evt: MouseOrTouch) => {
        sharedContents.setPasted(createContent())
        evt.stopPropagation()
      }}
      onUpdate = {(nc: ISharedContent) => {
        sharedContents.setPasted(nc)
      }}
    />
  )
}
