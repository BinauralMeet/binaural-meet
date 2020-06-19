import {SharedContent as ISharedContent} from '@models/SharedContent'
import {default as participants} from '@stores/Participants'
import {SharedContent} from '@stores/SharedContent'
import React, {useEffect, useState} from 'react'
import {RndContent} from './RndContent'

export interface PastedContentProps{
  content?:ISharedContent
}

export const PastedContent: React.FC<PastedContentProps> = (props:PastedContentProps) => {
  const nullContent = {
    type:'', url:'',
    pose:{position:[0, 0], orientation:0},
    size: [0, 0],
  } as ISharedContent
  const defContent: ISharedContent = props.content ? props.content : nullContent
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
              content.pose.position = (global as any).mousePositionOnMap
              for (let i = 0; i < 2; i += 1) { content.pose.position[i] -= content.size[i] / 2 }
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
            content.size[0] = 600
            content.size[1] = 800
          }else {
            content.type = 'text'
            content.pose.position = (global as any).mousePositionOnMap
            const slen = Math.sqrt(str.length)
            content.size[0] = slen * 14 * 2
            content.size[1] = slen * 14 / 2
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
        //  Add the pasted content to localPaticipant's contents and remove it.
        participants.local.get().addContent(Object.assign(new SharedContent(), content))
        setContent(nullContent)
      }}
      onClose = {(evt: React.MouseEvent<HTMLDivElement>) => {
        setContent(nullContent)
        evt.stopPropagation()
      }}
      onUpdate = {(nc: ISharedContent) => {
        setContent(nc)
      }}
    />
  )
}
