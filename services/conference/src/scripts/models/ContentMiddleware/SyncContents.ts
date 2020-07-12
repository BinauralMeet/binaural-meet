import {connection} from '@models/api'
import {default as ParticipantsStore} from '@stores/participants/Participants'
import {default as sharedContents, ParticipantContents, SharedContentsEvents} from '@stores/sharedContents/SharedContents'
import _ from 'lodash'
import {IReactionDisposer, reaction} from 'mobx'

//  send contentes owned by local when updated.
reaction(() => Array.from(sharedContents.localParticipant.myContents.values()),
         (contents) => {
           connection.sendSharedContents(contents)
           console.log('send contents: ', JSON.stringify(contents))
         },
)

//  send request from local when updated.
reaction(() => Array.from(sharedContents.localParticipant.updateRequest.values()),
         (updates) => {
           connection.sendSharedContentsUpdateRequest(updates)
           console.log('send contents update request: ', JSON.stringify(updates))
         },
)
//  send request from local when updated.
reaction(() => Array.from(sharedContents.localParticipant.removeRequest.values()),
         (removes) => {
           connection.sendSharedContentsRemoveRequest(removes)
           console.log('send contents remove request: ', JSON.stringify(removes))
         },
)

//  When user edit contents owned by remote participants, set update request.
const disposers:Map<string, IReactionDisposer> = new Map<string, IReactionDisposer>()
sharedContents.on(SharedContentsEvents.REMOTE_JOIN, (participant: ParticipantContents) => {
  if (participant.participantId === ParticipantsStore.localId) {
    console.log('SharedContentsEvents.REMOTE_JOIN emitted for local pid = ', participant.participantId)
  }
  console.log('Start to observe myContents pid = ', participant.participantId)
  const dispo = reaction(() => Array.from(participant.myContents.values()), () => {
    console.log('participant.myContents changed for pid = ', participant.participantId)
    const remoteContents = connection.getSharedContents(participant.participantId)
    remoteContents.forEach((rc) => {
      const my = participant.myContents.get(rc.id)
      if (my) {
        if (! _.isEqual(my, rc)) {
          console.log('Add update request for ', my.id)
          sharedContents.localParticipant.updateRequest.set(my.id, my)
        }
      }else {
        console.log('Add remove request for ', rc.id)
        sharedContents.localParticipant.removeRequest.add(rc.id)
      }
    })
  })
  disposers.set(participant.participantId, dispo)
})

//  when paticipant leave, remove reaction handelr.
sharedContents.on(SharedContentsEvents.REMOTE_LEAVE, (participant: ParticipantContents) => {
  const dispo = disposers.get(participant.participantId)
  if (dispo) { dispo() }
})
