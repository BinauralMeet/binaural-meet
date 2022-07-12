import participants from '@stores/participants/Participants'
import * as Kalidokit from 'kalidokit'
import {Holistic} from '@mediapipe/holistic'
import {VRMRigs} from '@models/Participant'
import {dataRequestInterval} from '@models/conference/DataConnection'

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

//  camera device selection
let videoEl: HTMLVideoElement|undefined
let runMeidaPipe = false
export function stopHolisticTrack(){
  if (videoEl){
    videoEl.srcObject = null
    videoEl.remove()
    videoEl = undefined
  }
  runMeidaPipe = false
}
export function startHolisticTrack(did?:string) {
  stopHolisticTrack()
  const promise = new Promise<void>((resolutionFunc, rejectionFunc) => {
    if (!did) did = participants.local.devicePreference.videoInputDevice

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
        deviceId:did,
        ...rtcVideo
      }}
    ).then((ms)=>{
      //  media-pipe
      videoEl = window.document.createElement('video') as HTMLVideoElement
      videoEl.srcObject = ms
      videoEl.autoplay = true
      holistic.onResults(results=>{
        //console.log('results:', results)
        // do something with prediction results
        // landmark names may change depending on TFJS/Mediapipe model version
        const facelm = results.faceLandmarks;
        const poselm = results.poseLandmarks;
        const poselm3d = (results as any).za;
        const rightHandlm = results.rightHandLandmarks;
        const leftHandlm = results.leftHandLandmarks;

        const vrmRigs: VRMRigs = {
          face:facelm && Kalidokit.Face.solve(facelm,{
            runtime:'mediapipe',
            video:videoEl,
          }),
          pose:(poselm3d&&poselm) && Kalidokit.Pose.solve(poselm3d,poselm,{
            runtime:'mediapipe',
            video:videoEl,
            imageSize: { height: 0, width: 0 },
            enableLegs: true,
          }),
          leftHand: leftHandlm && Kalidokit.Hand.solve(leftHandlm,"Left"),
          rightHand: rightHandlm && Kalidokit.Hand.solve(rightHandlm,"Right"),
        }
        participants.local.vrmRigs = vrmRigs
      })
      function timer(){
        holistic.send({image: videoEl!}).then(()=>{
          if (runMeidaPipe){
            window.setTimeout(timer, dataRequestInterval)
          }
        })
      }
      runMeidaPipe = true
      timer()
      resolutionFunc()
    }).catch(rejectionFunc)
  })

  return promise
}
