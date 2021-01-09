const rtcConfig = {
  maxBitrateForAudio: 24, // bitrate to send audio in kBPS
  maxBitrateForVideo: 64, // bitrate to send video in kBPS
  videoConstraints:{      // video constraint for getUserMedia()
    video:{
      //  facingMode:'user',  //  This rejects some virtual cameras
      width:{
        //  max:1920, //  somtimes it prohibit to use very heigh resolution cameras
        //  min:160,
        ideal:320,
      },
      height:{
        //  max:1080, //   somtimes it prohibit to use very heigh resolution cameras
        //  min:120,
        ideal:240,
      },
      frameRate: {
        ideal: 20,
      },
    },
  },
}
const common_config = {
  openBridgeChannel: 'datachannel', // One of true, 'datachannel'==='true', or 'websocket
  clientNode: 'http://jitsi.org/jitsimeet',
  disableSimulcast: true,
  channelLastN: -1,
  p2p: {
          enabled: false,
          preferH264: true,
          disableH264: true,
          useStunTurn: true, // use XEP-0215 to fetch STUN and TURN servers for the P2P connection
  },
  rtc:rtcConfig,
  testing: {
    octo: {
      probability: 1
    },
    capScreenshareBitrate: 128 * 1024,
  },
  thirdPersonView: true,
}

const config_binaural = {
  hosts: {
    domain: 'binaural.me',
    muc: 'conference.binaural.me'
  },
  bosh: 'https://binaural.me/http-bind',
}
Object.assign(config_binaural, Object.assign(common_config, config_binaural))

const config_local = {
  hosts: {
    domain: 'meet.jitsi',
    muc: 'muc.meet.jitsi',
    focus: 'focus.meet.jitsi',
  },
  bosh: 'https://localhost:8443/http-bind', // FIXME: use xep-0156 for that
}
Object.assign(config_local, Object.assign(common_config, config_local))

const config_alpha = {
  hosts: {
    domain: 'alpha.jitsi.net',
    muc: 'conference.alpha.jitsi.net',
    focus: 'focus.alpha.jitsi.net',
  },
  bosh: 'https://alpha.jitsi.net/http-bind', // FIXME: use xep-0156 for that
  openBridgeChannel: 'websocket',
}
Object.assign(config_alpha, Object.assign(common_config, config_alpha))

const config = config_binaural
