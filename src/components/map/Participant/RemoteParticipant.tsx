import {MoreButton, moreButtonControl, MoreButtonMember} from '@components/utils/MoreButton'
import {makeStyles} from '@material-ui/core/styles'
import participants from '@stores/participants/Participants'
import {RemoteParticipant as RemoteParticipantStore} from '@stores/participants/RemoteParticipant'
import {useObserver} from 'mobx-react-lite'
import React from 'react'
import {Participant, ParticipantProps} from './Participant'
import {RemoteParticipantForm} from './RemoteParticipantForm'

interface RemoteParticipantMember extends MoreButtonMember{
  timeout:NodeJS.Timeout|undefined
}

interface StyleProps {
  position: [number, number],
  size: number,
}
const useStyles = makeStyles({
  more: (props: StyleProps) => ({
    position: 'absolute',
    width: props.size * 0.5 ,
    height: props.size * 0.5,
    left: props.position[0] + props.size * 0.4,
    top: props.position[1] - props.size * 0.8,
  }),
})

export const RemoteParticipant: React.FC<ParticipantProps> = (props) => {
  const member = React.useRef<RemoteParticipantMember>({} as RemoteParticipantMember).current
  const [showMore, setShowMore] = React.useState(false)
  const moreControl = moreButtonControl(setShowMore, member)
  const [showForm, setShowForm] = React.useState(false)
  const [color] = props.participant.getColor()
  const styleProps = useObserver(() => ({
    position: props.participant.pose.position,
    size: props.size,
  }))
  const classes = useStyles(styleProps)
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
    props.stores.map.keyInputUsers.delete('remoteForm')
    setShowForm(false)
  }
  function openForm() {
    props.stores.map.keyInputUsers.add('remoteForm')
    setShowForm(true)
  }
  const buttonRef=React.useRef<HTMLButtonElement>(null)

  return (
    <div {...moreControl}
      onClick = {(ev)=>switchYarnPhone(ev, props.participant.id)}
      onContextMenu={(ev) => {ev.preventDefault(); openForm()}}
    >
      <Participant {...props} isLocal={false}/>
      <MoreButton show={showMore} className={classes.more} htmlColor={color} {...moreControl}
      buttonRef={buttonRef}
      onClickMore = {(ev)=>{
        ev.stopPropagation()
        openForm()
      }} />
      <RemoteParticipantForm open={showForm} close={onClose} stores={props.stores}
        participant={props.participant as RemoteParticipantStore}
        anchorEl={buttonRef.current} anchorOrigin={{vertical:'top', horizontal:'left'}}
        anchorReference = "anchorEl"
      />
    </div>
  )
}
