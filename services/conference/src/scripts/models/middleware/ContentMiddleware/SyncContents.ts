import {connection} from '@models/api'
import {default as ParticipantsStore} from '@stores/participants/Participants'
import {default as sharedContents, ParticipantContents, SharedContentsEvents} from '@stores/sharedContents/SharedContents'
import _ from 'lodash'
import {IReactionDisposer, reaction} from 'mobx'

//  send contentes owned by local when updated.
reaction(() => Array.from(sharedContents.localParticipant.contents.values()),
         (contents) => {
           connection.sendSharedContents(contents)
           console.log('send contents: ', JSON.stringify(contents))
         },
)

//  send request from local when updated.
reaction(() => Array.from(sharedContents.updateRequests.values()),
         (updates) => {
           connection.sendSharedContentsUpdateRequest(updates)
           console.log('send contents update request: ', JSON.stringify(updates))
         },
)
//  send request from local when updated.
reaction(() => Array.from(sharedContents.removeRequests.values()),
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

  const disposer = reaction(() => Array.from(participant.contents.values()), () => {
    console.log('participant.myContents changed for pid = ', participant.participantId)
    const remoteContents = connection.getSharedContents(participant.participantId)

    remoteContents.forEach((remoteContent) => {
      const my = participant.contents.get(remoteContent.id)

      if (my) {
        if (! _.isEqual(my, remoteContent)) {
          console.log('Add update request for ', my.id)
          sharedContents.updateRequests.set(my.id, my)
        }
      }else {
        console.log('Add remove request for ', remoteContent.id)
        sharedContents.removeRequests.add(remoteContent.id)
      }
    })
  })
  disposers.set(participant.participantId, disposer)
})

//  when paticipant leave, remove reaction handelr.
sharedContents.on(SharedContentsEvents.REMOTE_LEAVE, (participant: ParticipantContents) => {
  const dispo = disposers.get(participant.participantId)
  if (dispo) { dispo() }
})
