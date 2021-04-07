import React, {useEffect} from 'react'

function isRefObject<T>(obj: T | React.RefObject<T>): obj is React.RefObject<T> {
  return (obj as React.RefObject<T>).current !== undefined
}

export function usePaste(target: HTMLElement | React.RefObject<HTMLElement>) {
  useEffect(
    () => {
      const element = isRefObject(target) ? target.current : target
      if (element === null) {
        console.error('The ref object (target) is not assigned')

        return
      }

      const onPaste = (evt: ClipboardEvent) => {
        //  console.log('onPaste called')
        //  console.dir(evt)
        //  console.dir(evt.clipboardData)
        if (evt.clipboardData) {
          //  console.dir(evt.clipboardData.items)
          //  console.log(`text:${evt.clipboardData.getData('text')}`)
          //  console.log(`url:${evt.clipboardData.getData('url')}`)
          const imageFile = evt.clipboardData.items[0].getAsFile()
          //  console.dir(imageFile)
          if (imageFile) {
            const formData = new FormData()

            // FIXME sensitive data
            formData.append('access_token', 'e9889a51fca19f2712ec046016b7ec0808953103e32cd327b91f11bfddaa8533')
            formData.append('imagedata', imageFile)
            fetch('https://upload.gyazo.com/api/upload', {method: 'POST', body: formData})
            .then(response => response.json())
            .then((responseJson) => {
              console.log(`URL = ${responseJson.url}`)
              //  To do, add URL and ask user position to place the image
            })
            .catch((error) => {
              console.error(error)
            })
          }
        }

      }

      const pasteListener = (event: ClipboardEvent) => {
        onPaste(event)
        event.preventDefault()
      }

      console.log('add event listener', element)

      element.addEventListener(
        'paste',
        pasteListener,
      )

      const disposer = () => element.removeEventListener(
        'paste',
        pasteListener,
      )

      return disposer
    },
    [],
  )
}
