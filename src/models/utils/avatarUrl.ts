//  Display <-> storage mapping for the "Gravatar's email or VRM's URL" field in
//  LocalParticipantForm. Kept here, free of component/store imports, so the round-trip can be
//  unit-tested on its own (see __tests__/avatarUrl.test.ts).
import {isVrmUrl} from './utils'

//  Where the standard 3D avatar collection lives. Its index (`index.php?files`) and the .vrm
//  files themselves are served without CORS headers, so anything fetching them cross-origin has
//  to go through getCorsSafeUrl() in @models/api/CORS.
export const vrmUrlBase = 'https://binaural.me/public_packages/uploader/vrm/avatar/'

//  URLs into the standard collection are long and all share the same prefix, so only the file
//  name is shown.
export function makeEmailDisp(email: string){
  const lastSlashIdx = email.lastIndexOf('/')+1
  const base = email.substring(0, lastSlashIdx)
  if (base === vrmUrlBase){
    const file = email.substring(lastSlashIdx)
    return file
  }
  return email
}

//  The exact inverse of makeEmailDisp(). Without it the abbreviated display text is written
//  straight back into the store, destroying the real URL -- and a bare "maid.vrm" is not a URL,
//  so setupAvatarSrcAutorun() in LocalParticipant.ts then treats it as a Gravatar address and
//  the avatar silently disappears.
export function makeEmailInput(disp: string){
  //  A bare ".vrm" file name can only have come from the abbreviation above; anything else
  //  (a full URL, an email address) is stored exactly as typed.
  if (!disp.includes('/') && isVrmUrl(disp)){
    return `${vrmUrlBase}${disp}`
  }
  return disp
}
