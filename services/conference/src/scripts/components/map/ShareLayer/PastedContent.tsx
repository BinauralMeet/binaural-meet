import {uploadToGyazo} from '@models/api/Gyazo'
import {SharedContent as ISharedContent} from '@models/SharedContent'
import {default as participants} from '@stores/participants/Participants'
import {SharedContent} from '@stores/sharedContents/SharedContent'
import {default as sharedContents} from '@stores/sharedContents/SharedContents'
import {image} from 'faker'
import _ from 'lodash'
import React, {useEffect, useState} from 'react'
import {RndContent} from './RndContent'

export interface PastedContentProps{
  content?:ISharedContent
}

export const PastedContent: React.FC<PastedContentProps> = (props:PastedContentProps) => {
  const defContent: ISharedContent = props.content ? props.content : new SharedContent()
  const [content, setContent] = useState(defContent)

  function onPaste(evt: ClipboardEvent) {
    // console.log("onPaste called")
    if (evt.clipboardData) {
      if (evt.clipboardData.types.includes('Files')) {   //  If file is pasted (an image is also a file)
        const imageFile = evt.clipboardData.items[0].getAsFile()
        if (imageFile) {
          uploadToGyazo(imageFile).then(({url, size}) => {
            // console.log("mousePos:" + (global as any).mousePositionOnMap)
            content.url = url
            content.type = 'img'
            content.size = size
            const CENTER = 0.5
            for (let i = 0; i < content.pose.position.length; i += 1) {
              content.pose.position[i] = (global as any).mousePositionOnMap[i] - CENTER * content.size[i]
            }
            setContent(Object.assign({}, content))
          })
        }
      }else if (evt.clipboardData.types.includes('text/plain')) {
        evt.clipboardData.items[0].getAsString((str:string) => {
          content.url = str
          if (content.url.indexOf('http://') === 0 || content.url.indexOf('https://') === 0) {
            content.type = 'iframe'
            content.pose.position = (global as any).mousePositionOnMap
            const IFRAME_WIDTH = 600
            const IFRAME_HEIGHT = 800
            content.size[0] = IFRAME_WIDTH
            content.size[1] = IFRAME_HEIGHT
          }else {
            content.type = 'text'
            content.pose.position = (global as any).mousePositionOnMap
            const slen = Math.sqrt(str.length)
            const STRING_SCALE_W = 20
            const STRING_SCALE_H = 10
            content.size[0] = slen * STRING_SCALE_W
            content.size[1] = slen * STRING_SCALE_H
          }
          setContent(Object.assign({}, content))
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
      )
    },
    [],
  )

  return (
    <RndContent content={content} hideAll={content.type === ''}
      onShare = {(evt: React.MouseEvent<HTMLDivElement>) => {
        // console.log("onClick b:", evt.button, " bs:" ,evt.buttons, " d:", evt.detail, " p:", evt.eventPhase)
        //  Add the pasted content to sharedContents and clear the pastedContent.
        const TIME_RESOLUTION_IN_MS = 100
        content.zorder = Math.floor(Date.now() / TIME_RESOLUTION_IN_MS)
        sharedContents.addLocalContent(_.cloneDeep(content))
        setContent(new SharedContent)
      }}
      onClose = {(evt: React.MouseEvent<HTMLDivElement>) => {
        setContent(new SharedContent)
        evt.stopPropagation()
      }}
      onUpdate = {(nc: ISharedContent) => {
        setContent(nc)
      }}
    />
  )
}
