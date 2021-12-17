import {connection} from '@models/api'
import {contentTrackCarrierName} from '@models/api/Constants'
import {assert} from '@models/utils'
import {EventEmitter} from 'events'
import JitsiMeetJS, {JitsiLocalTrack} from 'lib-jitsi-meet'

// config.js
declare const config:any                  //  from ../../config.js included from index.html


export class ConnectionForContent extends EventEmitter {
  public jitsiConnection?: JitsiMeetJS.JitsiConnection
  public jitsiConference?: JitsiMeetJS.JitsiConference
  public localId = ''

  public init() {
    return new Promise<string>((resolve, reject) => {
      this.initJitsiConnection().then(() => {
        if (this.jitsiConnection) {
          this.jitsiConference = this.jitsiConnection.initJitsiConference(connection.conference.name, config)
          this.jitsiConference.on(JitsiMeetJS.events.conference.CONFERENCE_JOINED, () => {
            this.localId = this.jitsiConference!.myUserId()
            this.jitsiConference!.setPerceptibles({audibles:[], visibleContents:[], visibleParticipants:[]})
            setTimeout(()=>{
              this.jitsiConference!.setPerceptibles({audibles:[], visibleContents:[], visibleParticipants:[]})
            }, 1000)
            resolve('')
          })
          this.jitsiConference.setDisplayName(contentTrackCarrierName)
          this.jitsiConference.join('')
          this.jitsiConference.setSenderVideoConstraint(1080)
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
    const rv = new Promise((resolve, reject)=>{
      if (this.jitsiConnection) {
        if (this.jitsiConference){
          this.jitsiConference.leave().then(()=>{
            this.jitsiConnection?.disconnect().then(() => {
              resolve('')
            }).catch(reason=>{
              console.log(`ConnForCont: Fail to disconnect by ${reason}. I'm:${this.localId}`)
            })
          }).catch(reason => {
            console.log(`ConnForCont: Fail to leave by ${reason}. I'm:${this.localId}`)
          })
        }else{
          this.jitsiConnection?.disconnect().then(() => {
            resolve('')
          }).catch(reason => {
            console.log(`ConnForCont no conf: Fail to disconnect by ${reason}. I'm:${this.localId}`)
          })
        }
      }else{
        reject('No connection has been established.')
      }
    })

    return rv
  }
}
