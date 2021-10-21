import {BMProps} from '@components/utils'
import {ISharedContent, TIME_RESOLUTION_IN_MS} from '@models/ISharedContent'
import {createContent, createContentsFromDataTransfer} from '@stores/sharedContents/SharedContentCreator'
import {default as sharedContents} from '@stores/sharedContents/SharedContents'
import _ from 'lodash'
import {useObserver} from 'mobx-react-lite'
import React, {useEffect} from 'react'
import {MouseOrTouch, RndContent} from './RndContent'


export const PastedContent: React.FC<BMProps> = (props:BMProps) => {
  const map = props.stores.map
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
    createContentsFromDataTransfer(dataTransfer, map).then(cs => {
      for(const c of cs){
        if (SHARE_DIRECT) {
          sharedContents.shareContent(c)
        } else {
          sharedContents.setPasted(c)
        }
      }
    })
  }

  function onShare() {
    // console.log("onClick b:", evt.button, " bs:" ,evt.buttons, " d:", evt.detail, " p:", evt.eventPhase)
    //  Add the pasted content to sharedContents and clear the pastedContent.
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )
  const pastedContent = useObserver(() => sharedContents.pasted)
  //  console.log('Pasted contents rendered.')

  return (
    <RndContent {...props} hideAll={pastedContent.type === ''} content={pastedContent}
      onShare = {(evt: MouseOrTouch) => { onShare() }}
      onClose = {(evt: MouseOrTouch) => {
        sharedContents.setPasted(createContent())
        evt.stopPropagation()
      }}
      updateAndSend = {(nc: ISharedContent) => {
        sharedContents.setPasted(nc)
      }}
      updateOnly = {(nc: ISharedContent) => {
        sharedContents.setPasted(nc)
      }}
    />
  )
}
