import {loadFromStorage, saveToStorage} from '@stores/utils/PersistentStore'

declare const d:any               //  from index.html

export type LogCategory = 'CONNECTION' | 'CONTENT' | 'FORM' | 'POSITION' | 'PRIORITY'

const STORAGE_KEY = 'bm:debugLog'
const state: Record<LogCategory, boolean> = {
  CONNECTION: false,
  CONTENT: false,
  FORM: false,
  POSITION: false,
  PRIORITY: false,
}
loadFromStorage(state, STORAGE_KEY)

function isEnabled(category: LogCategory){
  return state[category]
}
function setEnabled(category: LogCategory, value: boolean){
  state[category] = value
  saveToStorage(state, STORAGE_KEY)
}

export interface CategoryLogger{
  (...args: any[]): void
  readonly enabled: boolean
}
function makeLog(category: LogCategory): CategoryLogger{
  const log = ((...args: any[]) => {
    if (isEnabled(category)) console.log(`[${category}]`, ...args)
  }) as CategoryLogger
  Object.defineProperty(log, 'enabled', {get: () => isEnabled(category)})
  return log
}

//  Each of these is directly callable (`connLog('...')`) and checks its flag on every call -- there
//  is no separate factory step to call once and cache, so a toggle always takes effect immediately.
//  For guarding a multi-line block instead of a single log call, use e.g. `if (priorityLog.enabled)`.
export const connLog = makeLog('CONNECTION')
export const contentLog = makeLog('CONTENT')
export const formLog = makeLog('FORM')
export const positionLog = makeLog('POSITION')
export const priorityLog = makeLog('PRIORITY')

//  Devtools entry point: `d.log.set('CONNECTION', true)` toggles a category and persists it to
//  localStorage (survives reload), `d.log.get()` shows current state. Namespaced under `d.log`
//  rather than flat `d.CONNECTIONLOG` to avoid colliding with `d`'s other role of exposing
//  singletons (`d.contentStore`, `d.participants`, etc.) for debugging.
d.log = {
  get: () => ({...state}),
  set: (category: LogCategory, value: boolean) => setEnabled(category, value),
}
