import {Avatar} from '@components/avatar'
import {Information} from '@models/Participant'
import React from 'react'


export default {
  title: 'Avatar',
}


const informationName: Information = {
  name: 'Hello World',
}
export const name = () => {
  return <Avatar information={informationName} />
}

const informationEmal: Information = Object.assign({}, informationName, {
  md5Email: 'a50236395ddbb8acc4a3533f43da66b5',
})
export const gavatar = () => {
  return <Avatar information={informationEmal} />
}
