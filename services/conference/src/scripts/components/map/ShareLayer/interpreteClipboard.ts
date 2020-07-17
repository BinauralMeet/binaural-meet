import {addImageProcess} from '@components/utils'
import {IframeSharedContent, ImgSharedContent, SharedContent, TextSharedContent} from '@stores/sharedContents/SharedContent'

export async function interpreteClipboard(
  clipboardData: DataTransfer, contentId: string): Promise<SharedContent | undefined> {
  if (clipboardData.types.includes('Files')) {   //  If file is pasted (an image is also a file)
    const imageFile = clipboardData.items[0].getAsFile()
    if (imageFile) {
      //  upload image file to Gayzo
      const formData = new FormData()
      formData.append('access_token', 'e9889a51fca19f2712ec046016b7ec0808953103e32cd327b91f11bfddaa8533')
      formData.append('imagedata', imageFile)
      try {
        const response = await fetch('https://upload.gyazo.com/api/upload', {method: 'POST', body: formData})
        const responseJson = await response.json()
        //  To do, add URL and ask user position to place the image
        const img = await addImageProcess(responseJson.url)
        const content = new ImgSharedContent(contentId)
        content.size = [img.width, img.height]
        // console.log("mousePos:" + (global as any).mousePositionOnMap)
        const CENTER = 0.5
        for (let i = 0; i < content.pose.position.length; i += 1) {
          content.pose.position[i] = (global as any).mousePositionOnMap[i] - CENTER * content.size[i]
        }
        content.url = responseJson.url

        return content
      } catch (err) {
        console.error(err)

        return undefined
      }
    }
  }else if (clipboardData.types.includes('text/plain')) {
    clipboardData.items[0].getAsString((str:string) => {
      if (str.indexOf('http://') === 0 || str.indexOf('https://') === 0) {
        const content = new IframeSharedContent(contentId)
        content.url = str
        content.pose.position = (global as any).mousePositionOnMap
        const IFRAME_WIDTH = 600
        const IFRAME_HEIGHT = 800
        content.size[0] = IFRAME_WIDTH
        content.size[1] = IFRAME_HEIGHT

        return content
      }

      const content = new TextSharedContent(contentId)
      content.text = str
      content.pose.position = (global as any).mousePositionOnMap
      const slen = Math.sqrt(str.length)
      const STRING_SCALE_W = 20
      const STRING_SCALE_H = 10
      content.size[0] = slen * STRING_SCALE_W
      content.size[1] = slen * STRING_SCALE_H

      return content
    })
  }

  return undefined
}
