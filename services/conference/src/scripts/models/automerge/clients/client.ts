import {ClientAdapter} from '../utils/ClientAdapter'
import {RawDocumentsType} from './RawDocumentsType'
import config from '../utils/config'

const socket = new WebSocket(config.url)

const client = new ClientAdapter<RawDocumentsType>(socket)

export default client
