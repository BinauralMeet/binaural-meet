import {urlParameters} from '@models/url'
import type {LocalParticipant} from './LocalParticipant'

// Applies ?name=/?headphone/?muteMic/?cameraOn URL params as one-time overrides
// on top of whatever was just loaded from storage.
export function applyUrlOverrides(participant: LocalParticipant): void {
  if (urlParameters.name) { participant.information.name = urlParameters.name }
  participant.useStereoAudio = urlParameters.headphone !== null
  participant.muteAudio = urlParameters.muteMic !== null
  participant.muteVideo = urlParameters.cameraOn === null
}
