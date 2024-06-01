
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
