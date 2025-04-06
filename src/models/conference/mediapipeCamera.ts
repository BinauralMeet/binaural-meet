import participants from '@stores/participants/Participants'
import {Holistic} from '@mediapipe/holistic'
import {FaceMesh} from '@mediapipe/face_mesh'
import {dataRequestInterval} from '@models/conference/DataConnection'
import { AllLandmarks } from '@models/Participant'

// config.js
declare const config:any                  //  from ../../config.js included from index.html


let holistic = new Holistic({locateFile: (file) => {
  return `https://cdn.jsdelivr.net/npm/@mediapipe/holistic/${file}`;
}})
holistic.setOptions({
  modelComplexity: 1,
  smoothLandmarks: true,
  minDetectionConfidence: 0.7,
  minTrackingConfidence: 0.7,
  refineFaceLandmarks:true
})

let faceMesh = new FaceMesh({locateFile: (file) => {
  return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
}})
faceMesh.setOptions({
  maxNumFaces: 1,
  refineLandmarks: true,
})

//  camera device selection
let videoEl: HTMLVideoElement|undefined
let runMeidaPipe = false
export function stopMpTrack(){
  if (videoEl){
    videoEl.srcObject = null
    videoEl.remove()
    videoEl = undefined
  }
  runMeidaPipe = false
}
export function startMpTrack(faceOnly: boolean, did?:string) {
  stopMpTrack()
  const promise = new Promise<void>((resolutionFunc, rejectionFunc) => {
    if (!did) did = participants.local.devicePreference.videoinput

    const rtcVideo = {...config.rtc.videoConstraints.video,
      width:{
        ideal:320,
      },
      height:{
        ideal:240,
      },
      frameRate: {
        ideal: 10,
      },
    }
    navigator.mediaDevices.getUserMedia(
      {video:{
        deviceId: did ? {exact: did} : did,
        ...rtcVideo
      }}
    ).then((ms)=>{
      //  media-pipe
      videoEl = window.document.createElement('video') as HTMLVideoElement
      videoEl.srcObject = ms
      videoEl.autoplay = true
      if (faceOnly){
        faceMesh.onResults(results=>{
          const lms:AllLandmarks = {
            faceLm: results.multiFaceLandmarks[0]
          }
          participants.local.landmarks = lms
        })
      }else{
        holistic.onResults(results => {
          //console.log(`MPResult:`, results)
          const lms:AllLandmarks = {
            faceLm: results.faceLandmarks,
            poseLm: results.poseLandmarks,
            poseLm3d: (results as any).za,
            leftHandLm: results.leftHandLandmarks,
            rightHandLm: results.rightHandLandmarks,
            image: results.image
          }
          participants.local.landmarks = lms
        })
      }
      function timer(detector:Holistic | FaceMesh){
        if (runMeidaPipe){
          if (videoEl?.videoWidth){
            detector.send({image: videoEl}).then(()=>{
              window.setTimeout(()=>{timer(detector)}, dataRequestInterval)
            })
          }else{
            window.setTimeout(()=>{timer(detector)}, dataRequestInterval)
          }
        }
      }
      runMeidaPipe = true
      timer(faceOnly ? faceMesh : holistic)
      resolutionFunc()
    }).catch(rejectionFunc)
  })

  return promise
}
