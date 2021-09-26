import { isSelfUrl } from '@models/utils'

export function makeLink(key:number, regResult: string[]){
  //console.log('reg:', regResult)
  let href='', target='', disp=''
  if (regResult[1]) { disp=href=regResult[1]; target='_blank' }
  else if (regResult[2]) {
    href = regResult[2]
    disp = regResult[6] ? regResult[6] : regResult[2]
    target = regResult[3] ? '_self' : '_blank'
  }
  else {
    disp = regResult[7]
    href = regResult[11]
    target = (regResult[9]||regResult[10]) ? '_self' : '_blank'
  }
  if (isSelfUrl(new URL(href))){
    target = '_self'
  }

  return <a key={key} href={href} target={target} rel="noreferrer">{disp}</a>
}
export function textToLinkedText(text: string){
  const textToShow:JSX.Element[] = []
  //  add link to URL strings
  const urlReg = 'https?:\\/\\/[-_.!~*\'()a-zA-Z0-9;/?:@&=+$,%#]+'
  const urlRegExp = new RegExp(`(${urlReg})|` +
    `\\[(${urlReg})(( *>)|( +move))?\\s*(\\S+)\\]` +
    `|\\[(\\S+)((\\s*>)|(\\s+move)|\\s)\\s*(${urlReg})\\]`)
  let regResult:RegExpExecArray | null
  let start = 0
  while ((regResult = urlRegExp.exec(text.slice(start))) !== null) {
    const before = text.slice(start, start + regResult.index)
    if (before) {
      textToShow.push(<span key={start}>{before}</span>)
    }
    textToShow.push(makeLink(start + before.length, regResult))
    start += before.length + regResult[0].length
  }
  textToShow.push(<span key={start}>{text.slice(start)}</span>)

  return textToShow
}