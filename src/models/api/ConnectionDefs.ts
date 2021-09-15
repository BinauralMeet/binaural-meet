// import a global variant $ for lib-jitsi-meet
import {default as ConnectionInfoStore} from '@stores/ConnectionInfo'
import {Connection} from './Connection'
export const connection = new Connection()
connection.Store = ConnectionInfoStore

declare const d:any                  //  from index.html
d.connection = connection
