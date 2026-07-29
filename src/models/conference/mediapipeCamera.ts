import participants from '@stores/participants/Participants'
import {Holistic, Results} from '@mediapipe/holistic'
import {FaceMesh} from '@mediapipe/face_mesh'
import {dataRequestInterval} from '@models/conference/DataConnection'
import {AllLandmarks} from '@models/utils/vrmIK'
import {HOLISTIC_MIN_DETECTION_CONFIDENCE, HOLISTIC_MIN_TRACKING_CONFIDENCE,
  MP_CAPTURE_WIDTH, MP_CAPTURE_HEIGHT, MP_CAPTURE_FRAME_RATE} from '@models/utils/vrmIkTuning'

//  @mediapipe/holistic's `Results` (its public, typed result shape) does not declare
//  `poseWorldLandmarks` at all, even though the underlying library does populate it at runtime --
//  it is only reachable via this minified/internal property name. There is no public, typed
//  alternative in the installed version of this library. If a future version of the library (or a
//  migration to @mediapipe/tasks-vision) renames/removes this internal field, this is the one place
//  that needs to change -- 3D pose landmarks would otherwise silently become `undefined`.
function getPoseWorldLandmarks(results: Results){
  return (results as any).za
}

// config.js
declare const config:any                  //  from ../../config.js included from index.html


let holistic = new Holistic({locateFile: (file) => {
  return `https://cdn.jsdelivr.net/npm/@mediapipe/holistic/${file}`;
}})
holistic.setOptions({
  modelComplexity: 0,
  smoothLandmarks: true,
  minDetectionConfidence: HOLISTIC_MIN_DETECTION_CONFIDENCE,
  minTrackingConfidence: HOLISTIC_MIN_TRACKING_CONFIDENCE,
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
let runMediaPipe = false
export function stopMpTrack(){
  if (videoEl){
    videoEl.srcObject = null
    videoEl.remove()
    videoEl = undefined
  }
  participants.local.landmarks = {}
  runMediaPipe = false
}
export function startMpTrack(faceOnly: boolean, did?:string) {
  stopMpTrack()
  const promise = new Promise<void>((resolutionFunc, rejectionFunc) => {
    if (!did) did = participants.local.devicePreference.videoinput

    const rtcVideo = {...config.rtc.videoConstraints.video,
      width:{
        ideal:MP_CAPTURE_WIDTH,
      },
      height:{
        ideal:MP_CAPTURE_HEIGHT,
      },
      frameRate: {
        ideal: MP_CAPTURE_FRAME_RATE,
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
            poseLm3d: getPoseWorldLandmarks(results),
            leftHandLm: results.leftHandLandmarks,
            rightHandLm: results.rightHandLandmarks,
            image: results.image
          }
          participants.local.landmarks = lms
        })
      }
      function timer(detector:Holistic | FaceMesh){
        if (runMediaPipe){
          if (videoEl?.videoWidth){
            detector.send({image: videoEl}).then(()=>{
              window.setTimeout(()=>{timer(detector)}, dataRequestInterval)
            })
          }else{
            window.setTimeout(()=>{timer(detector)}, dataRequestInterval)
          }
        }
      }
      runMediaPipe = true
      timer(faceOnly ? faceMesh : holistic)
      resolutionFunc()
    }).catch(rejectionFunc)
  })

  return promise
}
