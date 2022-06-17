// import a global variant $ for lib-jitsi-meet
import {default as connectionInfoStore} from '@stores/ConnectionInfo'
import {Connection} from './Connection'
export const connection = new Connection()
connection.store = connectionInfoStore

declare const d:any                  //  from index.html
d.connection = connection
