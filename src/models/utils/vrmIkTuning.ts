//  Smoothing/damping/threshold constants used by vrmIK.ts and mediapipeCamera.ts to turn
//  MediaPipe tracking landmarks into VRM bone rotations. Values are unchanged from where they
//  previously sat inline -- this file only gives them names. Most have no documented rationale
//  for the specific number chosen; that's noted per-constant below rather than invented after
//  the fact. Do not "clean up" these values without live-testing 3D avatar tracking, since they
//  were arrived at empirically.

//  --- mediapipeCamera.ts: MediaPipe Holistic detection + camera capture ---
export const HOLISTIC_MIN_DETECTION_CONFIDENCE = 0.7  //  empirically tuned; no documented rationale
export const HOLISTIC_MIN_TRACKING_CONFIDENCE = 0.7   //  empirically tuned; no documented rationale
export const MP_CAPTURE_WIDTH = 320                   //  camera capture size fed into MediaPipe tracking; empirically tuned
export const MP_CAPTURE_HEIGHT = 240                  //  empirically tuned
export const MP_CAPTURE_FRAME_RATE = 10               //  empirically tuned

//  --- vrmIK.ts: bone-rotation smoothing (lerp/slerp amounts; 0 = no movement, 1 = snap instantly) ---
export const DEFAULT_RIG_LERP_AMOUNT = 0.3   //  rigRotation()'s default smoothing when a caller doesn't override it; empirically tuned
export const FACE_ONLY_CHEST_LERP = 0.2      //  chest-follows-head-yaw smoothing when no body pose landmarks are available; empirically tuned
export const FACE_ONLY_SPINE_LERP = 0.1      //  same, for spine; slower than chest, ratio not documented
export const NECK_ROTATION_DAMPENER = 0.7    //  scales face-rig-derived neck rotation before applying; empirically tuned
export const HIPS_ROTATION_DAMPENER = 0.7    //  empirically tuned
export const CHEST_ROTATION_DAMPENER = 0.25  //  empirically tuned; ratio vs. hips/spine not documented
export const SPINE_ROTATION_DAMPENER = 0.45  //  empirically tuned; ratio vs. hips/chest not documented
export const SPINE_CHEST_LERP_AMOUNT = 0.3   //  shared smoothing amount for the chest/spine rigRotation calls above; empirically tuned
export const MOUTH_BLENDSHAPE_LERP = 0.5     //  blends each frame's new Kalidokit mouth shape with the previous blendshape value; empirically tuned
export const EYE_LOOK_TARGET_LERP = 0.4      //  smooths the eye look-target (pupil direction) between frames; empirically tuned
export const HAND_ORIENTATION_SLERP = 0.5    //  empirically tuned
export const FINGER_ROTATION_SLERP = 0.5     //  per-joint finger rotation smoothing; empirically tuned
export const ARM_CHAIN_SLERP = 0.5           //  smooths arm-chain bone rotations after the FIK solve; empirically tuned
export const IK_SOLVE_DISTANCE_THRESHOLD = 0.01  //  FIK chain solver convergence threshold; empirically tuned
export const HEAD_VRM_OFFSET_Z = -0.15       //  approximate offset (meters) between the landmark-based head position and the VRM head bone's center, along local Z; empirically tuned
export const NECK_PITCH_CORRECTION = 0.1     //  constant pitch offset subtracted from face-rig head.x before applying to the neck bone; empirically tuned
