interface Params {
  [key: string]: string | null
  name: string | null  // conference name
  userName: string | null  // user name
  headphone: headphoneType | null  // stereo headphone output
  speaker: headphoneType | null // monaural speaker output
  muteMic: muteType | null      // Mute the mic at start
  muteCamera: muteType | null   // Mute the camera at start
}

export function decodeGetParams(url: string): Params {
  const urlObj = new URL(url)
  const props = ['name', 'userName', 'headphone', 'speaker', 'muteCamera', 'muteMic']

  const res: Params = props.reduce(
    (pre, prop) => {
      pre[prop] = urlObj.searchParams.get(prop)

      return pre
    },
    {} as Params,
  )

  return res
}

type headphoneType = ''
type muteType = 'yes' | 'true' | 'no' | 'false'

