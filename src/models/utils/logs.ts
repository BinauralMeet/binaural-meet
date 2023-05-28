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
export function EVENTLOG(){ return d.EVENTLOG as boolean}
export function FORMLOG(){ return d.FORMLOG as boolean}
export function POSITIONLOG(){ return d.POSITIONLOG as boolean}
export function PRIORITYLOG() { return d.PRIORITYLOG as boolean}
export function SENDLOG(){ return d.SENDLOG as boolean}
export function TRACKLOG(){ return d.TRACKLOG as boolean }

export function trackLog(...data:any[]){
  d.TRACKLOG && console.log(data)
}
export function connLog(...data:any[]){
  d.CONNECTIONLOG && console.log(data)
}
export function connDebug(...data:any[]){
  d.CONNECTIONLOG && console.debug(data)
}
export function eventLog(...data:any[]){
  d.EVENTLOG && console.log(data)
}
export function sendLog(...data:any[]){
  d.SENDLOG && console.log(data)
}
export function formLog(...data:any[]){
  d.FORMLOG && console.log(data)
}
export function positionLog(...data:any[]){
  d.POSITIONLOG && console.log(data)
}
export function priorityLog(...data:any[]){
  d.PRIORITYLOG && console.log(data)
}
export function priorityDebug(...data:any[]){
  d.PRIORITYLOG && console.debug(data)
}

export function contentLog(...data:any[]){
  d.CONTENTLOG && console.log(data)
}
export function contentDebug(...data:any[]){
  d.CONTENTLOG && console.debug(data)
}
