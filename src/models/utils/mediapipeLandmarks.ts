//  Named indices for MediaPipe's landmark lists, per MediaPipe's own public documentation
//  (https://developers.google.com/mediapipe/solutions/vision/pose_landmarker and
//  .../hand_landmarker). These indices are stable/versioned by MediaPipe itself, not guessed --
//  only the subset actually used by this codebase (arms/shoulders, whole-hand) is named here.

//  Subset of MediaPipe Pose's 33 landmarks used by vrmIK.ts.
export enum PoseLandmark {
  NOSE = 0,
  LEFT_SHOULDER = 11,
  RIGHT_SHOULDER = 12,
  LEFT_ELBOW = 13,
  RIGHT_ELBOW = 14,
  LEFT_WRIST = 15,
  RIGHT_WRIST = 16,
}

//  All 21 landmarks of MediaPipe Hands (used for both left/right hand landmark lists).
export enum HandLandmark {
  WRIST = 0,
  THUMB_CMC = 1,
  THUMB_MCP = 2,
  THUMB_IP = 3,
  THUMB_TIP = 4,
  INDEX_FINGER_MCP = 5,
  INDEX_FINGER_PIP = 6,
  INDEX_FINGER_DIP = 7,
  INDEX_FINGER_TIP = 8,
  MIDDLE_FINGER_MCP = 9,
  MIDDLE_FINGER_PIP = 10,
  MIDDLE_FINGER_DIP = 11,
  MIDDLE_FINGER_TIP = 12,
  RING_FINGER_MCP = 13,
  RING_FINGER_PIP = 14,
  RING_FINGER_DIP = 15,
  RING_FINGER_TIP = 16,
  PINKY_MCP = 17,
  PINKY_PIP = 18,
  PINKY_DIP = 19,
  PINKY_TIP = 20,
}
