import {useEffect} from 'react'

export function usePaste(target: HTMLElement) {
  useEffect(
    () => {
      const onPaste = (evt: ClipboardEvent) => {
        console.log('onPaste called')
        console.dir(evt)
        console.dir(evt.clipboardData)
        if (evt.clipboardData) {
          console.dir(evt.clipboardData.items)
          console.log(`text:${evt.clipboardData.getData('text')}`)
          console.log(`url:${evt.clipboardData.getData('url')}`)
          const imageFile = evt.clipboardData.items[0].getAsFile()
          console.dir(imageFile)
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

      target.addEventListener(
        'paste',
        (event) => {
          onPaste(event)
          event.preventDefault()
        },
      )

      const disposer = () => target.removeEventListener(
        'paste',
        onPaste,
      )

      return disposer
    },
    [],
  )
}
