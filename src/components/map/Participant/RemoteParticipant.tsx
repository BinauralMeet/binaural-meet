import {MoreButton, moreButtonControl, MoreButtonMember} from '@components/utils/MoreButton'
import participants from '@stores/participants/Participants'
import {RemoteParticipant as RemoteParticipantStore} from '@stores/participants/RemoteParticipant'
import React, { CSSProperties } from 'react'
import {Participant, ParticipantProps} from './Participant'
import {RemoteParticipantForm} from './RemoteParticipantForm'
import {map} from '@stores/'

interface RemoteParticipantMember extends MoreButtonMember{
  timeout:number
}

export const RemoteParticipant: React.FC<ParticipantProps> = (props) => {
  const member = React.useRef<RemoteParticipantMember>({} as RemoteParticipantMember).current
  const [showMore, setShowMore] = React.useState(false)
  const moreControl = moreButtonControl(setShowMore, member)
  const [showForm, setShowForm] = React.useState(false)
  const [color] = props.participant.getColor()
  function switchYarnPhone(ev:React.MouseEvent<HTMLDivElement>, id:string){
    if (showForm){ return }
    if (participants.yarnPhones.has(id)) {
      participants.yarnPhones.delete(id)
    }else {
      participants.yarnPhones.add(id)
    }
    participants.yarnPhoneUpdated = true
  }
  function onClose() {
    map.keyInputUsers.delete('remoteForm')
    setShowForm(false)
  }
  function openForm() {
    map.keyInputUsers.add('remoteForm')
    setShowForm(true)
  }
  const buttonRef=React.useRef<HTMLButtonElement>(null)
  const participant = props.participant
  const moreStyle:CSSProperties = {
    position: 'absolute',
    width: props.size * 0.5 ,
    height: props.size * 0.5,
    left: participant.pose.position[0] + props.size * 0.4,
    top: participant.pose.position[1] - props.size * 0.8,
  }

  return (
    <div {...moreControl}
      onClick = {(ev)=>switchYarnPhone(ev, props.participant.id)}
      onContextMenu={(ev) => {ev.preventDefault(); openForm()}}
    >
      <Participant {...props} isLocal={false}/>
      <MoreButton show={showMore} style={moreStyle} htmlColor={color} {...moreControl}
      buttonRef={buttonRef}
      onClickMore = {(ev)=>{
        ev.stopPropagation()
        openForm()
      }} />
      <RemoteParticipantForm open={showForm} close={onClose}
        participant={props.participant as RemoteParticipantStore}
        anchorEl={buttonRef.current} anchorOrigin={{vertical:'top', horizontal:'left'}}
        anchorReference = "anchorEl"
      />
    </div>
  )
}
