import {connection} from '@models/api/Connection'
import {EventEmitter} from 'events'
import JitsiMeetJS from 'lib-jitsi-meet'

// config.js
declare const config:any                  //  from ../../config.js included from index.html
export const contentTrackCarrierName = '_contentTrackCarrier'

export class ConnectionForContent extends EventEmitter {
  private jitsiConnection?: JitsiMeetJS.JitsiConnection
  private jitsiConference?: JitsiMeetJS.JitsiConference
  public localId = ''

  public init() {
    return new Promise<string>((resolve, reject) => {
      this.initJitsiConnection().then(() => {
        if (this.jitsiConnection) {
          this.jitsiConference = this.jitsiConnection.initJitsiConference(connection.conferenceName, config)
          this.jitsiConference.setDisplayName(contentTrackCarrierName)
          this.jitsiConference.join('')
          this.jitsiConference.setSenderVideoConstraint(1080)
          this.jitsiConference.on(JitsiMeetJS.events.conference.CONFERENCE_JOINED, () => {
            this.localId = this.jitsiConference!.myUserId()
            this.jitsiConference?.setPerceptibles([[], []])
            resolve('')
          })
        }else {
          reject('No connection has been established.')
        }
      })
    })
  }

  private initJitsiConnection(): Promise < string > {
    return new Promise<string>(
      (resolve, reject) => {
        this.jitsiConnection = new JitsiMeetJS.JitsiConnection(null, undefined, config)
        this.jitsiConnection.connect()
      },
    )
  }

  public disconnect(): Promise < any > {
    if (this.jitsiConnection) {
      return this.jitsiConnection?.disconnect()
    }

    return Promise.reject('No connection has been established.')
  }
}
