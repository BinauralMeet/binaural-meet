export function getRandomColorRGB(v:string):[number, number, number] {
  let sum = 0
  for (let i = 0; i !== v.length; i += 1) {
    sum = v.charCodeAt(i) + sum * 13
  }
  const num = sum % 0x1000
  const r = Math.floor(num / 0x100) % 0x10
  const g = Math.floor(num / 0x10) % 0x10
  const b = Math.floor(num) % 0x10

  return [r * 17, g * 17, b * 17]
}

export function findTextColorRGB(rgb: number[]):number[] {
  const textColor = isDarkColor(rgb) ? [255, 255, 8*17] : [0,0,8*17]

  return textColor
}
export function isDarkColor(rgb: number[]){
  return rgb[0] + rgb[1] + rgb[2] * 0.2 < 20 * 17
}

export function findReverseColorRGB(rgb: number[]):number[] {
  return [255-rgb[0], 255-rgb[1], 255-rgb[2]]
}

export function rgb2Color(rgb: number[]):string{
  const [r, g, b] = [Math.floor(rgb[0]), Math.floor(rgb[1]), Math.floor(rgb[2])]
  const color = `#${`0${r.toString(16)}`.slice(-2)}${`0${g.toString(16)}`.slice(-2)}${`0${b.toString(16)}`.slice(-2)}`

  return color
}

export function rgb2Colors(rgb: number[]):[string, string, string]{
  const [r, g, b] = [rgb[0] / 17, rgb[1] / 17, rgb[2] / 17]
  const textColor = isDarkColor(rgb) ? '#FF8' : '#008'
  const color = `#${r.toString(16)}${g.toString(16)}${b.toString(16)}`
  const reverseColor = `#${(15 - r).toString(16)}${(15 - g).toString(16)}${(15 - b).toString(16)}`

  return [color, textColor, reverseColor]
}

export function getRandomColor(v:string):[string, string, string] {
  const rgb = getRandomColorRGB(v)

  return rgb2Colors(rgb)
}

export function rgba(rgb:number[], alpha: number) {
  return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`
}
