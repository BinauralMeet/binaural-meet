interface Params {
  [key: string]: string | null
  name: string | null  // conference name
  stereo: headphoneType | null  // stereo headphone output
  monaural: headphoneType | null // monaural speaker output
  muteMic: muteType | null      // Mute the mic at start
  muteCamera: muteType | null   // Mute the camera at start
}

export function decodeGetParams(url: string): Params {
  const urlObj = new URL(url)
  const props = ['name', 'userName', 'headphone', 'muteCamera', 'muteMic']

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

