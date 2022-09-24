const rtcConfig = {
  maxBitrateForAudio: 24, // bitrate to send audio in kBPS
  maxBitrateForVideo: 64, // bitrate to send video in kBPS
  videoConstraints:{      // video constraint for getUserMedia()
    video:{
      //  facingMode:'user',  //  This rejects some virtual cameras
      width:{
        ideal:360,
      },
      height:{
        ideal:360,
      },
      frameRate: {
        ideal: 20,
      },
    },
  },
  screenOptions:{
    desktopSharingFrameRate:{
      min:  0.3,
      max:  60,
    },
  },
}
commonConfig = {
  remoteVideoLimit:10,
  remoteAudioLimit:20,
  thirdPersonView: true,
  rtc: rtcConfig,
}

const configTitech = {
  mainServer: 'wss://main.titech.binaural.me',
  bmRelayServer: 'wss://relay.titech.binaural.me',
  //bmRelayServer: 'ws://localhost:80',
  corsProxyUrl: 'https://binaural.me/cors_proxy/',
}
Object.assign(configTitech, Object.assign(commonConfig, configTitech))

const configLocal = {
  mainServer: 'wss://localhost:3100',
  bmRelayServer: 'wss://relay.titech.binaural.me',
  corsProxyUrl: 'https://binaural.me/cors_proxy/',
}
Object.assign(configLocal, Object.assign(commonConfig, configLocal))

const config = configTitech

