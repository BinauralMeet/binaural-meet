
function pad2(n: number){
  return ("0" + n).slice(-2)
}
function pad4(n: number){
  return ("000" + n).slice(-4)
}

export function dateTimeString(n?: number){
  if (n===undefined){
    n = Date.now()
  }
  const d = new Date(n)
  return `${pad4(d.getFullYear())}.${pad2(d.getMonth()+1)}.${pad2(d.getDate())}_`
   + `${pad2(d.getHours())}.${pad2(d.getMinutes())}`
}
/*
function timeString(duration:number){
  const du = new Date(duration)
  const h = du.getUTCHours()
  const m = du.getMinutes()
  const text = (h ? `${h}:` : '') + (m ? `${m}:` :'') + `${du.getSeconds()}.${(du.getMilliseconds()/100).toFixed(0)}`
  return text
}
*/

export function timeToHourMinSecDec(offset: number){
  const decimal = (offset % 1000).toString().padEnd(2, '0').slice(0, 2)
  offset = Math.floor(offset / 1000)
  const sec = (offset % 60).toString().padStart(2, '0')
  offset = Math.floor(offset / 60)
  const min = (offset % 60).toString().padStart(2, '0')
  offset = Math.floor(offset / 60)
  const hour = offset

  return `${hour? `${hour}:` : ''}${min}:${sec}.${decimal}`
}
export function timeToHourMinSec(offset: number){
  offset = Math.floor(offset / 1000)
  const sec = (offset % 60).toString().padStart(2, '0')
  offset = Math.floor(offset / 60)
  const min = (offset % 60).toString().padStart(2, '0')
  offset = Math.floor(offset / 60)
  const hour = offset

  return `${hour? `${hour}:` : ''}${min}:${sec}`
}
