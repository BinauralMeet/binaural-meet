import {connection} from '@models/api'
import {SharedContent as ISharedContent} from '@models/SharedContent'
import {default as ParticipantsStore} from '@stores/participants/Participants'
import {contentDebug, contentLog, default as sharedContents, ParticipantContents, SharedContentsEvents} from '@stores/sharedContents/SharedContents'
import _ from 'lodash'
import {IReactionDisposer, reaction} from 'mobx'

export const CONTENT_SYNC_DELAY = 300

//  send contentes owned by local when updated.
reaction(() => Array.from(sharedContents.localParticipant.myContents.values()),
         (contents) => {
           connection.conference.sendSharedContents(contents)
         },
         {delay: CONTENT_SYNC_DELAY},
)

function removeDobuleRequest(requests:Set<string>|Map<string, ISharedContent>) {
  const deletes = []
  const requestKeys = Array.from(requests.keys())
  for (const req of requestKeys) {
    for (const participant of sharedContents.participants) {
      if (participant[0] === sharedContents.localParticipant.participantId) { continue }
      //  If remote has request to the same content, refrain to send request.
      if (participant[1].removeRequest.has(req) || participant[1].updateRequest.has(req)) {
        deletes.push(req)
      }
    }
  }
  for (const del of deletes) {
    requests.delete(del)
  }

  return deletes
}

//  send update request from local to remotes.
reaction(() => Array.from(sharedContents.localParticipant.updateRequest.values()),
         (updates) => {
           // Check if already requested by other participants
           removeDobuleRequest(sharedContents.localParticipant.updateRequest)
           const reqs = Array.from(sharedContents.localParticipant.updateRequest.values())
           connection.conference.sendSharedContentsUpdateRequest(reqs)
         },
         {delay: CONTENT_SYNC_DELAY},
)
//  send remove request from local to remotes.
reaction(() => Array.from(sharedContents.localParticipant.removeRequest.values()),
         (removes) => {
           // Check if already requested by other participants
           removeDobuleRequest(sharedContents.localParticipant.removeRequest)
           const reqs = Array.from(sharedContents.localParticipant.updateRequest.values())
           connection.conference.sendSharedContentsRemoveRequest(removes)
         },
         {delay: CONTENT_SYNC_DELAY},
)


//  -----------------------------------------------------------------------
//  Create update/remove request when use edit/remove remote content
const disposers:Map<string, IReactionDisposer> = new Map<string, IReactionDisposer>()
sharedContents.on(SharedContentsEvents.REMOTE_JOIN, (participant: ParticipantContents) => {
  if (participant.participantId === ParticipantsStore.localId) {
    contentLog('SharedContentsEvents.REMOTE_JOIN emitted for local pid = ', participant.participantId)

    return // for local data, do nothing.
  }

  contentDebug('Start to observe myContents of pid:', participant.participantId)
  const dispo = reaction(() => Array.from(participant.myContents.values()), () => {
    contentDebug('remote contents changed for pid = ', participant.participantId)
    // Get contents before modification from jitsi
    const contentsBefore = connection.conference.getSharedContents(participant.participantId)
    // Compare new remote contents in store (after) and old remote contents in store (before).
    contentsBefore.forEach((before) => {
      const after = participant.myContents.get(before.id)
      if (after) {
        before.perceptibility = after.perceptibility  //  not a target of comparison.
        if (! _.isEqual(after, before)) {
          if (sharedContents.localParticipant.updateRequest.has(after.id)) {
            contentLog(`Update request for ${after.id} is already in queue. Refrain to send next one.`)
            participant.myContents.set(after.id, before)                    //  back to before modification
            sharedContents.localParticipant.updateRequest.delete(after.id)  //  delete previous request
          } else {
            contentLog('Add update request for ', after.id)
            sharedContents.localParticipant.updateRequest.set(after.id, after)
          }
        }
      }else {
        contentDebug('Add remove request for ', before.id)
        sharedContents.localParticipant.removeRequest.add(before.id)
      }
    })
  },
                         {delay: CONTENT_SYNC_DELAY})
  disposers.set(participant.participantId, dispo)
})

//  when paticipant leave, remove reaction handelr.
sharedContents.on(SharedContentsEvents.REMOTE_LEAVE, (participant: ParticipantContents) => {
  const dispo = disposers.get(participant.participantId)
  if (dispo) { dispo() }
})
