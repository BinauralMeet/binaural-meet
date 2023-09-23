// config.js
declare const d:any               //  from index.html

d.CONNECTIONLOG = false
d.CONTENTLOG = false
d.EVENTLOG = false
d.FORMLOG = false
d.POSITIONLOG = false
d.PRIORITYLOG = false
d.SENDLOG = false
d.TRACKLOG = false                // show add, remove... of tracks


export function CONNECTIONLOG(){ return d.CONNECTIONLOG as boolean}
export function CONTENTLOG() { return d.CONTENTLOG as boolean}
export function FORMLOG(){ return d.FORMLOG as boolean}
export function POSITIONLOG(){ return d.POSITIONLOG as boolean}
export function PRIORITYLOG() { return d.PRIORITYLOG as boolean}
export function SENDLOG(){ return d.SENDLOG as boolean}

function noLog(..._data:any[]){}
export function connLog(){
  return d.CONNECTIONLOG ? console.log : noLog
}
export function connDebug(){
  return d.CONNECTIONLOG ? console.debug : noLog
}
export function sendLog(){
  return d.SENDLOG ? console.log : noLog
}
export function formLog(){
  return d.FORMLOG ? console.log : noLog
}
export function positionLog(){
  return d.POSITIONLOG ? console.log : noLog
}
export function priorityLog(){
  return d.PRIORITYLOG ? console.log : noLog
}
export function priorityDebug(){
  return d.PRIORITYLOG ? console.debug : noLog
}
export function contentLog(){
  return d.CONTENTLOG ? console.log : noLog
}
export function contentDebug(){
  return d.CONTENTLOG ? console.debug : noLog
}
