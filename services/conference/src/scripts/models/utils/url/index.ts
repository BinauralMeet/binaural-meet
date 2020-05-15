interface Params {
  [key: string]: string | null
  name: string | null  // conference name
}

export function decodeParams(url: string): Params {
  const urlObj = new URL(url)
  const props = ['name']

  const res: Params = props.reduce(
    (pre, prop) => {
      pre[prop] = urlObj.searchParams.get(prop)

      return res
    },
    {} as Params,
  )

  return res
}
