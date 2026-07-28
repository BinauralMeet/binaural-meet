import md5 from 'md5'
import {autorun} from 'mobx'
import {checkImageUrl, isVrmUrl} from '@models/utils'
import type {LocalParticipant} from './LocalParticipant'

// Keeps LocalParticipant.information.avatarSrc in sync with a Gravatar/VRM lookup
// derived from information.email, whenever no explicit avatarSrc is already set.
export function setupAvatarSrcAutorun(participant: LocalParticipant): void {
  autorun(() => { //  image avatar
    const gravatar = 'https://www.gravatar.com/avatar/'
    const vrm = 'https://'
    let src = participant.information.avatarSrc
    if ((!src || src.includes(gravatar, 0) || src.includes(vrm, 0)) && participant.information.email){
      const email = participant.information.email.trim()
      if (email.includes(vrm) && isVrmUrl(email)){
        src = email
      }else{
        const hash = md5(participant.information.email.trim().toLowerCase())
        src = `${gravatar}${hash}?d=404`
      }
    }
    if (src){
      if (isVrmUrl(src)){
        participant.information.avatarSrc = src
      }else{
        checkImageUrl(src).then((src)=>{
          participant.information.avatarSrc = src
        }).catch(()=>{
          //participant.information.avatarSrc = '' //  This could make infinite loop.
        })
      }
    }
  })
}
