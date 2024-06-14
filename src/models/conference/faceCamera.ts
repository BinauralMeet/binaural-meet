import {loadFaceLandmarkTinyModel, loadTinyFaceDetectorModel, detectSingleFace,
  TinyFaceDetectorOptions, Point, WithFaceLandmarks, FaceLandmarks68, FaceDetection} from 'face-api.js'
import {rgba} from '@models/utils/color'
import participants from '@stores/participants/Participants'
import {addV2, mulV2, rotateVector2DByDegree, subV2} from '@models/utils'
import {MSTrack} from '@models/conference/RtcConnection'

// config.js
declare const config:any                  //  from ../../config.js included from index.html

//  camera device selection
var interval:number
var videoEl: HTMLVideoElement|undefined
var imageEl: HTMLImageElement|undefined
var canvasBufEl: HTMLCanvasElement|undefined
var lms: Point[] = []
const FACE_FPS = 15
var imageLoaded = false
function drawFace(width:number, height:number,
  canvasEl: HTMLCanvasElement, face?: WithFaceLandmarks<{detection:FaceDetection}, FaceLandmarks68>){
  if (!width) width = 100
  if (!height) height = 100
  //  canvas element's size
  canvasEl.style.width = `${width}px`
  canvasEl.style.height = `${height}px`
  //  canvas viewport size
  canvasEl.width = width
  canvasEl.height = height
  if (!canvasBufEl){
    canvasBufEl = window.document.createElement('canvas') as HTMLCanvasElement
  }
  canvasBufEl.width = width
  canvasBufEl.height = height
  const ctx = canvasBufEl.getContext('2d')
  if (!ctx) return
  ctx.strokeStyle = participants.local.getColor()[2]
  ctx.lineWidth = 6
  ctx.lineCap = 'round'
  ctx.fillRect(0, 0, width, height)
  if (participants.local.information.avatarSrc && !imageEl){
    imageEl = new Image()
    imageEl.onload = () => {
      imageLoaded = true
    }
    imageEl.crossOrigin = 'anonymous'
    imageEl.src = participants.local.information.avatarSrc
  }
  if (!participants.local.information.avatarSrc && imageEl){
    imageEl.remove()
    imageLoaded = false
    imageEl = undefined
  }
  if (imageLoaded && imageEl){
      ctx.drawImage(imageEl, 0, 0, imageEl.width, imageEl.height, 0,0, width, height)
  }else{
    const nameArray = participants.local.information.name.split(' ')
    let initial = ''
    nameArray.forEach(s => initial += s ? s.substring(0,1) : '')
    initial = initial.substring(0,2)
    ctx.fillStyle = rgba(participants.local.getTextColorRGB(), 0.5)
    ctx.font = `${0.3 * height}px Sans`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(initial, 0.5*width, 0.5*height, 0.8*width)
    ctx.fillStyle = participants.local.getColor()[0]
  }
  /*
    ctx.drawImage(videoEl, 0,0)
    const box = face?.detection.box
    ctx.strokeRect(box.left, box.top, box.width, box.height)  */
  if (face) lms = face.landmarks.positions
  const paths = [lms.slice(0, 17), lms.slice(17, 22), lms.slice(22, 27),
    lms.slice(27, 31), lms.slice(31, 36) ]
  const eyes = [lms.slice(36, 42), lms.slice(42, 48)]
  const mouse = [/*lms.slice(48,60), */ lms.slice(60,68)]
  function drawStrokes(ctx: CanvasRenderingContext2D, paths: Point[][], close: boolean){
    for (const path of paths){
      ctx.beginPath()
      for(const pos of path){
        if (pos === path[0]) ctx.moveTo(pos.x, pos.y)
        else ctx.lineTo(pos.x, pos.y)
      }
      if (close) ctx.closePath()
      ctx.stroke()
    }
  }
  drawStrokes(ctx, paths, false)
  drawStrokes(ctx, eyes, true)
  drawStrokes(ctx, mouse, true)

  const ctx2 = canvasEl.getContext('2d')
  ctx2?.drawImage(canvasBufEl, 0, 0)
}

var lastPos:number[] = []
var lastWidth:number = -1
var lastNose:number[] = []
var filteredPos:number[] = []
var filteredWidth:number = -1
var filteredNose:number[] = []
function moveAvatar(face?: WithFaceLandmarks<{detection:FaceDetection}, FaceLandmarks68>){
  if (face){
    const currentPos = [face.detection.relativeBox.x, face.detection.relativeBox.y]
    const currentWidth = face.detection.relativeBox.width
    const nosePos = [face.landmarks.positions[30].x, face.landmarks.positions[30].y]
    const currentNose = subV2(nosePos, [face.detection.box.left, face.detection.box.top])
    currentNose[0] = currentNose[0] / face.detection.box.width
    currentNose[1] = currentNose[1] / face.detection.box.height
    //  console.log(`nose: ${currentNose[0]}, ${currentNose[1]}`)

    if (filteredPos.length){
      const alpha = 0.2
      filteredPos = addV2(mulV2(alpha, currentPos), mulV2(1-alpha, lastPos))
      filteredWidth = alpha * currentWidth + (1-alpha) * lastWidth
      const alphaNose = 0.4
      filteredNose = addV2(mulV2(alphaNose, currentNose), mulV2(1-alphaNose, lastNose))
    }else{
      filteredPos = currentPos
      filteredWidth = currentWidth
      filteredNose = currentNose
    }
    if (lastPos.length){
      const diffWorldPos = subV2(filteredPos, lastPos)
      const diffWidth = filteredWidth - lastWidth
      const diffAvatarPos = rotateVector2DByDegree(participants.local.pose.orientation, [diffWorldPos[0], diffWidth])
      participants.local.pose.position = addV2(participants.local.pose.position, mulV2(-100, diffAvatarPos))
    }
    if (lastNose.length){
      const diffNose = subV2(filteredNose, lastNose)
      participants.local.pose.orientation += -100 * diffNose[0]
      const newNodding = participants.local.viewpoint.nodding ? participants.local.viewpoint.nodding + diffNose[1] : diffNose[1]
      participants.local.viewpoint.nodding = 0.99 * newNodding
    }
    lastPos = filteredPos
    lastWidth = filteredWidth
    lastNose = filteredNose
  }
}

var canvasEl: HTMLCanvasElement|undefined
var loaded = false
export function stopFaceTrack(){
  if (interval){
    window.clearInterval(interval)
    interval = 0
  }
  if (videoEl) videoEl.srcObject = null
  participants.local.viewpoint.nodding = undefined
}
export function createLocalCamera(faceTrack: boolean, did?:string) {
  const promise = new Promise<MSTrack>((resolutionFunc, rejectionFunc) => {
    if (!did){
      did = participants.local.devicePreference.videoinput
    }
    navigator.mediaDevices.getUserMedia(
      {video:{
        deviceId:did,
        ...config.rtc.video
      }}
    ).then((ms)=>{
      if (faceTrack){
        if (!videoEl){
          //  face-api
          loadTinyFaceDetectorModel('/faceApiModels').then(()=>{
            loadFaceLandmarkTinyModel('/faceApiModels').then(()=>{
              loaded = true
            })
          })
          videoEl = window.document.createElement('video') as HTMLVideoElement
          videoEl.autoplay = true
        }
        if (!canvasEl) canvasEl = window.document.createElement('canvas') as HTMLCanvasElement
        videoEl.srcObject = ms
        if (interval){ window.clearInterval(interval) }
        const ops = new TinyFaceDetectorOptions({inputSize: 160, scoreThreshold: 0.5})
        interval = window.setInterval(()=>{
          if (interval === 0) return
          if (loaded){
            detectSingleFace(videoEl!, ops).withFaceLandmarks(true).then((face) => {
              drawFace(videoEl!.videoWidth, videoEl!.videoHeight, canvasEl!, face)
              moveAvatar(face)
              return face
            }).catch(()=>{
              drawFace(videoEl!.videoWidth, videoEl!.videoHeight, canvasEl!)
            })
          }else{
            drawFace(videoEl!.videoWidth, videoEl!.videoHeight, canvasEl!)
          }
        }, 1000.0 / FACE_FPS)
        const mediaStream = canvasEl.captureStream(FACE_FPS)
        const track:MSTrack = {
          track: mediaStream.getVideoTracks()[0],
          peer: participants.local.id,
          role: 'avatar'
        }
        resolutionFunc(track)
      }else{
        stopFaceTrack()
        const track:MSTrack = {
          track: ms.getVideoTracks()[0],
          peer: participants.local.id,
          role: 'avatar'
        }
        resolutionFunc(track)
      }
    }).catch(rejectionFunc)
  })

  return promise
}
