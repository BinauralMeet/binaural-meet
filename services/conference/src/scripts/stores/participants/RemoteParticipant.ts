import {RemoteParticipant as IRemoteParticipant} from '@models/Participant'
import {Store} from '../utils'
import {ParticipantBase} from './ParticipantBase'

export class RemoteParticipant extends ParticipantBase implements Store<IRemoteParticipant> {
}
