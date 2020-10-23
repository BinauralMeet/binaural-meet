const rtcConfig = {
  maxBitrateForAudio: 32, // bitrate to send audio in kBPS
  maxBitrateForVideo: 96, // bitrate to send video in kBPS
  videoConstraints:{      // video constraint for getUserMedia()
    video:{
      facingMode:'user',
      width:{
        max:1920,
        min:160,
        ideal:320,
      },
      height:{
        max:1080,
        min:120,
        ideal:240,
      },
      frameRate: {
        ideal: 20,
      },
    },
  },
}

const config_haselab_net = {
  hosts: {
    domain: 'meet.jitsi',
    muc: 'muc.meet.jitsi',
    focus: 'focus.meet.jitsi',
  },
  openBridgeChannel: true, // One of true, 'datachannel'==='true', or 'websocket'
  bosh: 'https://jitsi.haselab.net/http-bind', // FIXME: use xep-0156 for that
  clientNode: 'http://jitsi.org/jitsimeet',
  focusUserJid: 'focus@auth.meet.jitsi',
  channelLastN: -1,
  p2p: {
    enabled: false,
  },
  rtc:rtcConfig
}

const config_party_haselab = {
  hosts: {
    domain: 'meet.jitsi',
    muc: 'muc.meet.jitsi',
    focus: 'focus.meet.jitsi',
  },
  openBridgeChannel: true, // One of true, 'datachannel'==='true', or 'websocket'
  bosh: 'https://party.haselab.net/http-bind', // FIXME: use xep-0156 for that
  clientNode: 'http://jitsi.org/jitsimeet',
  focusUserJid: 'focus@auth.meet.jitsi',
  channelLastN: -1,
  p2p: {
    enabled: false,
  },
  rtc:rtcConfig
}

const config_alpha = {
  hosts: {
    domain: 'alpha.jitsi.net',
    muc: 'conference.alpha.jitsi.net',
    focus: 'focus.alpha.jitsi.net',
  },
  openBridgeChannel: true, // One of true, 'datachannel'==='true', or 'websocket'
  p2p: {
    enabled: false,
    preferH264: true,
    disableH264: true,
    useStunTurn: true, // use XEP-0215 to fetch STUN and TURN servers for the P2P connection
  },
  bosh: 'https://alpha.jitsi.net/http-bind', // FIXME: use xep-0156 for that
  rtc:rtcConfig
}

const config_local = {
  hosts: {
    domain: 'meet.jitsi',
    muc: 'muc.meet.jitsi',
    focus: 'focus.meet.jitsi',
  },
  openBridgeChannel: true, // One of true, 'datachannel'==='true', or 'websocket'
  bosh: 'https://localhost:8443/http-bind', // FIXME: use xep-0156 for that
  clientNode: 'http://jitsi.org/jitsimeet',
  focusUserJid: 'focus@auth.meet.jitsi',
  channelLastN: -1,
  p2p: {
    enabled: false,
  },
  rtc:rtcConfig
}

const config = config_alpha
config.thirdPersonView = true