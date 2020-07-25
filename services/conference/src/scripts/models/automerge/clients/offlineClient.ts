import {ClientAdapter} from '../utils/ClientAdapter'
import {RawDocumentsType} from './RawDocumentsType'

const fakeUrl = 'ws://localhost:12345'

const socket = new WebSocket(fakeUrl)

const client = new ClientAdapter<RawDocumentsType>(socket)

export default client
