const canvas = document.createElement<'canvas'>('canvas')
const ctx = canvas.getContext('2d')
const width = 512
const height = 512
canvas.width = width
canvas.height = height
const framerate = 30
const bitrate = 200

function nextMessage(target: Worker): Promise<any> {
  return new Promise((resolve) => {
    return target.addEventListener('message', e => resolve(e.data), {
      once: true,
    })
  })
}

const baseUrl = 'worker'
export const worker = new Worker(`${baseUrl}/dist/webm-worker.js`)
export function init(): Promise<any> {
  worker.postMessage('webm-wasm.wasm')

  return nextMessage(worker).then(
    () => {
      worker.postMessage({timebaseDen: framerate, width, height, bitrate})

      if (ctx) {
        const gradient = ctx.createLinearGradient(
          (1 / 4) * width,
          0,
          (3 / 4) * width,
          0,
        )
        gradient.addColorStop(0, '#000')
        gradient.addColorStop(1, '#fff')
        const maxFrames = 2 * framerate
        // tslint:disable-next-line: no-increment-decrement
        for (let i = 0; i < maxFrames; i++) {
          ctx.fillStyle = `hsl(${(i * 360) / maxFrames}, 100%, 50%)`
          ctx.fillRect(0, 0, width, height)
          ctx.fillStyle = gradient
          ctx.fillRect((1 / 4) * width, (1 / 4) * height, width / 2, height / 2)
          ctx.font = '48px Arial'
          ctx.fillText('Hello World', (1 / 4) * width, (1 / 4) * height)
          const imageData = ctx.getImageData(0, 0, width, height)
          worker.postMessage(imageData.data.buffer, [imageData.data.buffer])
        }
        worker.postMessage(null)

        return nextMessage(worker)
      }

      return Promise.reject('no context')
    },
  )
  // .then(
  //   (ret) => {
  //     const webm = ret.data
  //     const blob = new Blob([webm], {type: 'video/webm'})
  //     const url = URL.createObjectURL(blob)

  //     const video = document.createElement('video')
  //     video.muted = true
  //     video.autoplay = true
  //     video.loop = true
  //     video.controls = true
  //     video.src = url
  //     document.body.append(video)
  //     video.play()
  //   },
  // )
}

