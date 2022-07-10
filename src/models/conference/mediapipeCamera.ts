import participants from '@stores/participants/Participants'
import {MSTrack} from '@models/utils'
import * as Kalidokit from 'kalidokit'
import {Holistic} from '@mediapipe/holistic'
import {Camera} from '@mediapipe/camera_utils'
import {VRMRigs} from '@models/Participant'

// config.js
declare const config:any                  //  from ../../config.js included from index.html

let holistic = new Holistic({locateFile: (file) => {
  return `https://cdn.jsdelivr.net/npm/@mediapipe/holistic/${file}`;
}})
holistic.setOptions({refineFaceLandmarks:true})

//  camera device selection
var interval:NodeJS.Timeout|undefined
var videoEl: HTMLVideoElement|undefined
const FACE_FPS = 20
function moveAvatar(vrmRigs:VRMRigs){
  participants.local.vrmRigs = vrmRigs
  //console.log(`face: ${JSON.stringify(vrmRigs.face)}`)
  //console.log(`pose: ${JSON.stringify(vrmRigs.pose)}`)
}

var canvasEl: HTMLCanvasElement|undefined
export function clearFaceTrack(){
  if (interval){
    clearInterval(interval)
    interval = undefined
  }
  if (videoEl) videoEl.srcObject = null
  participants.local.viewpoint.nodding = undefined
}
export function createLocalCamera(faceTrack: boolean, did?:string) {
  const promise = new Promise<MSTrack>((resolutionFunc, rejectionFunc) => {
    if (!did){
      did = participants.local.devicePreference.videoInputDevice
    }

    const rtcVideo = {...config.rtc.videoConstraints.video,
      width:{
        ideal:640,
      },
      height:{
        ideal:480,
      },
    }
    navigator.mediaDevices.getUserMedia(
      {video:{
        deviceId:did,
        ...rtcVideo
      }}
    ).then((ms)=>{
      if (faceTrack){
        if (!videoEl){
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
              face:Kalidokit.Face.solve(facelm,{
                runtime:'mediapipe',
                video:videoEl,
                imageSize: { height: 0, width: 0 },
                smoothBlink: false, // smooth left and right eye blink delays
                //blinkSettings: [0.25, 0.75], // adjust upper and lower bound blink sensitivity
              }),
              pose:Kalidokit.Pose.solve(poselm3d,poselm,{
                runtime:'mediapipe',
                video:videoEl,
                imageSize: { height: 0, width: 0 },
                enableLegs: true,
              }),
              leftHand: leftHandlm ? Kalidokit.Hand.solve(leftHandlm,"Left") : undefined,
              rightHand: rightHandlm ? Kalidokit.Hand.solve(rightHandlm,"Right") : undefined,
            }
            moveAvatar(vrmRigs)
          })

          const camera = new Camera(videoEl, {
            onFrame: async () => {
              await holistic.send({image: videoEl!});
            },
            width: 640,
            height: 480
          });
          camera.start();
        }
        if (!canvasEl) canvasEl = window.document.createElement('canvas') as HTMLCanvasElement
        const mediaStream = canvasEl.captureStream(FACE_FPS)
        const track:MSTrack = {
          track: mediaStream.getVideoTracks()[0],
          peer: participants.local.id,
          role: 'avatar'
        }
        resolutionFunc(track)
      }else{
        clearFaceTrack()
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
