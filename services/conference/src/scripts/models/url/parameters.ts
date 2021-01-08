interface Params {
  [key: string]: string | null
  room: string | null  // conference room
  name: string | null  // user name
  headphone: headphoneType | null  // stereo headphone output
  speaker: headphoneType | null // monaural speaker output
  muteMic: muteType | null      // Mute the mic at start
  muteCamera: muteType | null   // Mute the camera at start
}

export function decodeGetParams(url: string): Params {
  const urlObj = new URL(url)
  const props = ['room', 'name', 'headphone', 'speaker', 'muteCamera', 'muteMic']

  const res: Params = props.reduce(
    (pre, prop) => {
      pre[prop] = urlObj.searchParams.get(prop)

      return pre
    },
    {} as Params,
  )
  res.name = urlObj.pathname.substr(1).toLowerCase().replace(/[\.\/\@]/, '_') + (res.name ? res.name.toLowerCase() : '')

  return res
}

type headphoneType = ''
type muteType = 'yes' | 'true' | 'no' | 'false'

