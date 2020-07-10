import {connection} from '@models/api'
import {SharedContent} from '@stores/sharedContents/SharedContent'
import {default as sharedContents, SharedContentsEvents, ParticipantContents} from '@stores/sharedContents/SharedContents'
import {reaction, observe, comparer, Lambda, ObservableMap, IReactionDisposer} from 'mobx'
import _, { remove } from 'lodash'

//  send contentes owned by local when updated.
reaction(() => Array.from(sharedContents.localParticipant.myContents.values()),
        (contents) => {
          connection.sendSharedContents(contents)
          console.log("send contents: ", contents)
        }
)

//  send request from local when updated.
reaction(() => Array.from(sharedContents.localParticipant.updateRequest.values()),
        (updates) => {
          connection.sendSharedContentsUpdateRequest(updates)
          console.log("send contents update request: ", updates)
        },
)
//  send request from local when updated.
reaction(() => Array.from(sharedContents.localParticipant.removeRequest.values()),
        (removes) => {
          connection.sendSharedContentsRemoveRequest(removes)
          console.log("send contents remove request: ", removes)
        },
)

//  When user edit contents owned by remote participants, set update request.
/*
const disposers:Map<string, IReactionDisposer> = new Map<string, IReactionDisposer>()
sharedContents.on(SharedContentsEvents.REMOTE_JOIN, (participant: ParticipantContents) => {
  const dispo = reaction(() => Array.from(participant.myContents.values()),
    (contents) =>{
      const remoteContents = connection.getSharedContents(participant.participantId)


    })
    disposers.set(participant.participantId, dispo)
}
*/
const disposers:Map<string, Lambda>=new Map<string, Lambda>()
sharedContents.on(SharedContentsEvents.REMOTE_JOIN, (participant: ParticipantContents) => {
  const dispo = observe(participant.myContents, () => {
    console.log('participant.myContents changed for pid = ', participant.participantId)
    const remoteContents = connection.getSharedContents(participant.participantId)
    remoteContents.forEach(rc => {
      const my = participant.myContents.get(rc.id)
      if (my){
        if (! _.isEqual(my, rc)){
          console.log('Add update request for ', my.id)
          sharedContents.localParticipant.updateRequest.set(my.id, my)
        }
      }else{
        console.log('Add remove request for ', rc.id)
        sharedContents.localParticipant.removeRequest.add(rc.id)
      }
    })
  } )
  disposers.set(participant.participantId, dispo)
})

sharedContents.on(SharedContentsEvents.REMOTE_LEAVE, (participant: ParticipantContents) => {
  const dispo = disposers.get(participant.participantId)
  if (dispo){ dispo() }
})
