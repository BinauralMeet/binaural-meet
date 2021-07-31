import {Connection} from '@models/api'
import {Participants} from '@stores/participants/Participants'
import {SharedContents} from '@stores/sharedContents/SharedContents'

export class Room {
  name = ''
  participants = new Participants()
  contents = new SharedContents()
  connection?:Connection = undefined
  constructor (name: string, connection?:Connection){
    this.connection = connection
    this.name = name
  }
}
