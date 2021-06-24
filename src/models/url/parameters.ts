interface Params {
  [key: string]: string | null
  rooms: string | null               // conference room names
  connect: string | null
  ui: string | null
}

export function decodeGetParams(url: string): Params {
  const urlObj = new URL(url)
  const props = ['rooms', 'connect', 'ui']

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
