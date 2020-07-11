import {SharedContent as ISharedContent} from '@models/SharedContent'
import {default as participants} from '@stores/participants/Participants'
import {SharedContent} from '@stores/sharedContents/SharedContent'
import {default as sharedContents} from '@stores/sharedContents/SharedContents'
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
          //  upload image file to Gayzo
          const formData = new FormData()
          formData.append('access_token', 'e9889a51fca19f2712ec046016b7ec0808953103e32cd327b91f11bfddaa8533')
          formData.append('imagedata', imageFile)
          fetch('https://upload.gyazo.com/api/upload', {method: 'POST', body: formData})
          .then(response => response.json())
          .then((responseJson) => {
            // console.log("URL = " + responseJson.url)
            //  To do, add URL and ask user position to place the image
            const img = new Image()
            img.src = responseJson.url
            img.onload = () => {
              content.size = [img.width, img.height]
              // console.log("mousePos:" + (global as any).mousePositionOnMap)
              const CENTER = 0.5
              for (let i = 0; i < content.pose.position.length; i += 1) {
                content.pose.position[i] = (global as any).mousePositionOnMap[i] - CENTER * content.size[i]
              }
              content.url = responseJson.url
              content.type = 'img'
              setContent(Object.assign({}, content))
            }
          })
          .catch((error) => {
            console.error(error)
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
