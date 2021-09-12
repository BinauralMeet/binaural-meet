interface Params {
  [key: string]: string | null
  room: string | null               // conference room name
  name: string | null               // user name
  headphone: headphoneType | null   // stereo headphone output
  speaker: headphoneType | null     // monaural speaker output
  cameraOn: muteType | null       // Mute the camera at start
  muteMic: muteType | null          // Mute the mic at start
  testBot: string | null            // Tester bot mode
  skipEntrance: string | null       // skip entrance
}

export function decodeGetParams(url: string): Params {
  const urlObj = new URL(decodeURI(url))
  const props = ['room', 'name', 'headphone', 'speaker', 'cameraOn', 'muteMic', 'testBot', 'skipEntrance']

  const res: Params = props.reduce(
    (pre, prop) => {
      pre[prop] = urlObj.searchParams.get(prop)

      return pre
    },
    {} as Params,
  )
  res.room = urlObj.pathname.substr(1).toLowerCase().replace(/[./@]/, '_') + (res.room ? res.room.toLowerCase() : '')

  return res
}

type headphoneType = ''
type muteType = 'yes' | 'true' | 'no' | 'false'

