import {connection} from '@models/api'
import {assert} from '@models/utils'
import {EventEmitter} from 'events'
import JitsiMeetJS, {JitsiLocalTrack} from 'lib-jitsi-meet'

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

  public addTrack(track:JitsiLocalTrack) {
    if (this.jitsiConference) {
      this.jitsiConference.addTrack(track)
    }else {
      console.error('Not joined to conference yet.')
    }
  }
  public removeTrack(track:JitsiLocalTrack):Promise<any> {
    if (this.jitsiConference) {

      return this.jitsiConference.removeTrack(track)
    }
    console.error('Not joined to conference yet.')

    return Promise.reject()
  }
  public getParticipantId() {
    assert(this.jitsiConference)

    return this.localId
  }
  public getLocalTracks() {
    const tracks = this.jitsiConference?.getLocalTracks()

    return tracks ? tracks : []
  }

  private initJitsiConnection(): Promise < string > {
    return new Promise<string>(
      (resolve, reject) => {
        this.jitsiConnection = new JitsiMeetJS.JitsiConnection(null, undefined, config)
        this.jitsiConnection.addEventListener(JitsiMeetJS.events.connection.CONNECTION_ESTABLISHED, () => {
          resolve(JitsiMeetJS.events.connection.CONNECTION_ESTABLISHED)
        })
        this.jitsiConnection.addEventListener(JitsiMeetJS.events.connection.CONNECTION_FAILED, () => {
          reject(JitsiMeetJS.events.connection.CONNECTION_FAILED)
        })
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
