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
  websocketTimeout: 60 * 1000,
}

const configTitech = {
  mainServer: 'wss://main.titech.binaural.me',
  dataServer: 'wss://main.titech.binaural.me',
  //bmRelayServer: 'wss://data.titech.binaural.me',
  //dataServer: 'ws://localhost:80',
  corsProxyUrl: 'https://binaural.me/cors_proxy/',
}

const configVrc = {
  mainServer: 'wss://vrc.jp/main',
  dataServer: 'wss://vrc.jp/main',
  corsProxyUrl: 'https://binaural.me/cors_proxy/',
}

const configLocal = {
  mainServer: 'wss://localhost:3100',
  dataServer: 'wss://localhost:3100',
  corsProxyUrl: 'https://binaural.me/cors_proxy/',
}

const config = Object.assign(Object.assign({}, commonConfig), configTitech)
