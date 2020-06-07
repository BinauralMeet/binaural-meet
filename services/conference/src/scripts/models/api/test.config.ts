
let subdomain = ''
if (subdomain) {
  subdomain = `${subdomain.substr(0, subdomain.length - 1).split('.').join('_').toLowerCase()}.`
}
export const config = {
  hosts: {
    domain: 'alpha.jitsi.net',
    muc: 'conference.alpha.jitsi.net',
    focus: 'focus.alpha.jitsi.net',
  },
  disableSimulcast: false,
  enableRemb: true,
  enableTcc: true,
  resolution: 720,
  constraints: {
    video: {
      height: {
        ideal: 720,
        max: 720,
        min: 180,
      },
      width: {
        ideal: 1280,
        max: 1280,
        min: 320,
      },
    },
  },
  externalConnectUrl: '//alpha.jitsi.net/http-pre-bind',
  applicationName: "Jitsi Meet",
  callStatsID: "294674397",
  callStatsSecret: "9IJJTtOdheZs:MHov7tz0Gc3h/6NYXiNVCqA1tpTmKPH0AdXTYtAKVRY=",
  channelLastN: -1,
  chromeExtensionId: "pgplkhlodppdcflanmijbnpgpjkegfgc",
  enableP2P: false, // flag to control P2P connections
    // New P2P options
  p2p: {
    enabled: false,
    preferH264: true,
    disableH264: true,
    useStunTurn: true, // use XEP-0215 to fetch STUN and TURN servers for the P2P connection
  },
  useStunTurn: true, // use XEP-0215 to fetch TURN servers for the JVB connection
  useIPv6: false, // ipv6 support. use at your own risk
  useNicks: false,
  bosh: 'https://alpha.jitsi.net/http-bind', // FIXME: use xep-0156 for that
  websocket: 'wss://alpha.jitsi.net/xmpp-websocket', // FIXME: use xep-0156 for that

  clientNode: 'http://jitsi.org/jitsimeet', // The name of client node advertised in XEP-0115 'c' stanza
  openBridgeChannel: 'websocket', // One of true, 'datachannel', or 'websocket'
  rttMonitor:{
    analyticsInterval: 60000,
    enabled: false,
    getStatsInterval: 10000,
    initialDelay: 30000,
    stunServers:{
      "ap-se-1": "all-ap-se-1-turn.jitsi.net:443",
      "ap-se-2": "all-ap-se-2-turn.jitsi.net:443",
      "eu-central-1": "all-eu-central-1-turn.jitsi.net:443",
      "eu-west-1": "all-eu-west-1-turn.jitsi.net:443",
      "us-east-1": "all-us-east-1-turn.jitsi.net:443",
      "us-west-2": "all-us-west-2-turn.jitsi.net:443"
    }
  },
  deploymentInfo:{
    crossRegion: 0,
    envType: "dev",
    environment: "alpha",
    region: "us-west-2",
    releaseNumber: "",
    shard: "all",
    userRegion: "",
  }
}
