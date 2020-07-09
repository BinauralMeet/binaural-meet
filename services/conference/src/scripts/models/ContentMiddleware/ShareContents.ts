import {connection} from '@models/api'
import {SharedContent} from '@stores/sharedContents/SharedContent'
import {default as sharedContents} from '@stores/sharedContents/SharedContents'
import JitsiMeetJS, {JitsiLocalTrack, JitsiTrackOptions, JitsiValues} from 'lib-jitsi-meet'
import {reaction, comparer, autorun} from 'mobx'
import _ from 'lodash'

//  send contentes owned by local when updated.
//reaction(() => _.cloneDeep(Array.from(sharedContents.localParticipant?.myContents ?
autorun(() => {
  const cs = Array.from(sharedContents.localParticipant.myContents.values())
  console.log('autorun:')
  cs.forEach(c => {
    console.log(c)
  });
})
reaction(() => sharedContents.localParticipant.myContents,
         (contents) => {
           if (contents) {
             connection.sendSharedContents(Array.from(contents.values()))
           }
           console.log("send contents: ", contents)
         },
)

//  send request from local when updated.
reaction(() => _.cloneDeep(sharedContents.localParticipant?.updateRequest),
         (update) => {
           if (update) {
             connection.sendSharedContentsUpdateRequest(Array.from(update?.values()))
             console.log("send contents update request: ", update)
            }
         },
         {equals:comparer.structural}
)
//  send request from local when updated.
reaction(() => _.cloneDeep(sharedContents.localParticipant?.removeRequest),
         (remove) => {
           if (remove) {
             connection.sendSharedContentsRemoveRequest(Array.from(remove.values()))
             console.log("send contents remove request: ", remove)
           }
         },
         {equals:comparer.structural}
)
