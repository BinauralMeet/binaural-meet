const config_jitsi_haselab_net = {
  hosts: {
    domain: 'meet.jitsi',
    muc: 'muc.meet.jitsi',
  },
//  openBridgeChannel: 'datachannel', // One of true, 'datachannel', or 'websocket'
  bosh: 'https://jitsi.haselab.net/http-bind', // FIXME: use xep-0156 for that
  clientNode: 'http://jitsi.org/jitsimeet',
  focusUserJid: 'focus@auth.meet.jitsi',
  testing: {
    enableFirefoxSimulcast: false,
    p2pTestMode: false,
  },
  enableNoAudioDetection: true,
  enableNoisyMicDetection: true,
  desktopSharingChromeExtId: null,
  desktopSharingChromeSources: ['screen', 'window', 'tab'],
  desktopSharingChromeMinExtVersion: '0.1',
  channelLastN: -1,
  p2p: {
    enabled: false,
    stunServers: [
      {urls: 'stun:meet-jit-si-turnrelay.jitsi.net:443'},
    ],
    preferH264: true,
  },
  analytics: {},
//  useStunTurn: false, // use XEP-0215 to fetch STUN and TURN server for the JVB connection
//  useIPv6: false, // ipv6 support. use at your own risk
//  useNicks: false,
//  websocket: 'wss://jitsi.haselab.net/xmpp-websocket', // FIXME: use xep-0156 for that
}

const config_alpha = {
  hosts: {
    domain: 'alpha.jitsi.net',
    muc: 'conference.alpha.jitsi.net',
    focus: 'focus.alpha.jitsi.net',
  },
  p2p: {
    enabled: false,
    preferH264: true,
    disableH264: true,
    useStunTurn: true, // use XEP-0215 to fetch STUN and TURN servers for the P2P connection
  },
  bosh: 'https://alpha.jitsi.net/http-bind', // FIXME: use xep-0156 for that
  //  rtc config for jitsi-party
  rtc: {
    maxBitrateForAudio: 32, // bitrate to send audio in kBPS
    maxBitrateForVideo: 96, // bitrate to send video in kBPS
    videoConstraints:{      // video constraint for getUserMedia()
      video:{
        facingMode:'user',
        width:{
          max:1280,
          min:160,
          ideal:320,
        },
        height:{
          max:720,
          min:120,
          ideal:240,
        },
        frameRate: {
          ideal: 20,
          max: 40,
        },
      },
    },
  },
}

const config = config_alpha
