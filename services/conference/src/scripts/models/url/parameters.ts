interface Params {
  [key: string]: string | null
  name: string | null  // conference name
  audio: audioOutputType | null // mono or stereo audio output
}

export function decodeGetParams(url: string): Params {
  const urlObj = new URL(url)
  const props = ['name', 'audio', 'userName']

  const res: Params = props.reduce(
    (pre, prop) => {
      pre[prop] = urlObj.searchParams.get(prop)

      return pre
    },
    {} as Params,
  )

  return res
}

type audioOutputType = 'mono' | 'stereo'
