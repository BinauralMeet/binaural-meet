import {Chat} from '@stores/Chat'
import {MapData} from '@stores/Map'
import {Participants} from '@stores/participants/Participants'
import {RoomInfo} from '@stores/RoomInfo'
import {SharedContents} from '@stores/sharedContents/SharedContents'

export function formatTimestamp(stamp: number){
  const textDate = new Date(stamp)
  const now = new Date()
  const year = now.getFullYear() !== textDate.getFullYear() ? textDate.getFullYear() : undefined
  const month = year || now.getMonth() !== textDate.getMonth() ? textDate.getMonth() + 1 : undefined
  const date = (year || month || now.getDate() !== textDate.getDate()) ? textDate.getDate() : undefined
  const time = `${textDate.getHours()}:${textDate.getMinutes()}:${textDate.getSeconds()}`
  const timestamp = `${year ? `${year}.` : ''}${month ? `${month}.` : ''}${date ? `${date} ` : ''}${time}`

  return timestamp
}

export const pointerStoppers = {
  onMouseDown: (ev:React.MouseEvent) => {ev.stopPropagation()},
  onMouseUp: (ev:React.MouseEvent) => {ev.stopPropagation()},
  onPointerDown: (ev:React.MouseEvent) => {ev.stopPropagation()},
  onPointerUp: (ev:React.MouseEvent) => {ev.stopPropagation()},
}

export * from './formatter'
export * from './styles'
