const rtcConfig = {
  maxBitrateForAudio: 24, // bitrate to send audio in kBPS
  maxBitrateForVideo: 64, // bitrate to send video in kBPS
  videoConstraints:{      // video constraint for getUserMedia()
    video:{
      //  facingMode:'user',  //  This rejects some virtual cameras
      width:{
        //  max:1920, //  somtimes it prohibit to use very heigh resolution cameras
        //  min:160,
        ideal:360,
      },
      height:{
        //  max:1080, //   somtimes it prohibit to use very heigh resolution cameras
        //  min:120,
        ideal:360,
      },
      frameRate: {
        ideal: 20,
      },
    },
  },
  audioConstraints:{
    //audio: {echoCancellationType: 'system'}
  },
  screenOptions:{
    desktopSharingFrameRate:{
      min:  0.3,
      max:  30,
    },
  },
}
const common_config = {
  openBridgeChannel: 'websocket', // One of true, 'datachannel'==='true', or 'websocket
  clientNode: 'http://jitsi.org/jitsimeet',
  disableSimulcast: true,
  channelLastN: -1,
  p2p: {
          enabled: false,
          preferH264: true,
          disableH264: true,
          useStunTurn: true, // use XEP-0215 to fetch STUN and TURN servers for the P2P connection
  },
  xmppPing: {
    interval: 1000,
    timeout: 5000
  },
//  enableWebsocketResume: false,
  testing: {
    octo: {
      probability: 1
    },
    capScreenshareBitrate: 128 * 1024,
  },
  rtc:rtcConfig,
  remoteVideoLimit:10,
  remoteAudioLimit:15,
  thirdPersonView: true,
}

const config_binaural = {
  hosts: {
    domain: 'ac.binaural.me',
    muc: 'conference.ac.binaural.me'
  },
  serviceUrl: 'wss://ac.binaural.me:443/xmpp-websocket',
  //  bosh: 'https://ac.binaural.me/http-bind',
}
Object.assign(config_binaural, Object.assign(common_config, config_binaural))

const config = config_binaural
