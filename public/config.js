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
  soundLocalizationBase: 'avatar',
  avatarDisplay3D: false,
  avatarDisplay2_5D: false,
}

const configTitech = {
  mainServer: 'wss://main.titech.binaural.me',
  dataServer: 'wss://main.titech.binaural.me',
  //bmRelayServer: 'wss://data.titech.binaural.me',
  //dataServer: 'ws://localhost:80',
  corsProxyUrl: 'https://binaural.me/cors_proxy/',
  //  Gyazo OAuth app (each user uploads into their own Gyazo; models/api/GyazoAuth.ts). The client
  //  id is public by design; the secret lives only in the main server's config.js. The redirect
  //  URI must be exactly the one registered with the app.
  gyazoClientId: 'wpmsU2tIX64AaCj3t_vERkEZh2E69jUF',
  gyazoRedirectUri: 'https://binaural.me/',
}

const configVrc = {
  mainServer: 'wss://vrc.jp/main',
  dataServer: 'wss://vrc.jp/main',
  corsProxyUrl: 'https://binaural.me/cors_proxy/',
}

const configLocal = {
  mainServer: 'wss://ai1.haselab.net/sandbox/port3100/',
  dataServer: 'wss://ai1.haselab.net/sandbox/port3100/',
  corsProxyUrl: 'https://binaural.me/cors_proxy/',
}

const config = Object.assign(Object.assign({}, commonConfig), configTitech)
