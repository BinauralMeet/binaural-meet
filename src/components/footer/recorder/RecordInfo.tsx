import List from '@material-ui/core/List'
import {DialogPageProps} from './RecorderDialog'
import {DialogIconItem} from '@components/utils/DialogIconItem'
import {player} from '@models/recorder'
import {Box} from '@material-ui/core'
import { getColorOfParticipant } from '@models/Participant'
import { ImageAvatar } from '@components/avatar/ImageAvatar'
import { timeToHourMinSec } from '@models/utils/date'
import { contentTypeIcons } from '@components/map/Share/Content'
import SpeakerOnIcon from '@material-ui/icons/VolumeUp'
import VideoIcon from '@material-ui/icons/Videocam'

export const RecordInfo: React.FC<DialogPageProps> = (props) => {

  if (player.header){
    const startTime = player.header.messages.startTime
    const duration = player.header.messages.endTime - startTime
    const {parts, conts} = player.makeParticipantsAndContentsList()
    const blobs = Array.from(player.header.blobs)
    blobs.sort((a, b)=>{
      const diff = a.time! - b.time!
      if (diff === 0) return a.duration! - b.duration!
      return diff
    })

    const items:JSX.Element[] = []
    for(const blob of blobs){
      const startTimeStr = timeToHourMinSec(blob.time! - startTime)
      const endTimeStr = timeToHourMinSec(blob.time! - startTime + blob.duration!)
      const kindIcon = blob.kind === 'audio' ? <SpeakerOnIcon /> : <VideoIcon />
      const onClick = () => {
        if(props.recorderStep === 'infoFromMenu'){
          player.load(undefined, player.title, true)?.then(()=>{
            //console.log(`seek ${player.title}`)
            player.pause()
            player.seek(blob.time! - startTime)
            player.play()
          }).catch((e)=>{
            console.warn(e)
          })
        }else if (props.recorderStep === 'infoFromButton'){
          const orgState = player.state
          player.pause()
          player.seek(blob.time! - startTime)
          if (orgState === 'play') player.play()
        }
        props.setRecorderStep('none')
      }

      if (blob.pid){
        const p = parts.get(blob.pid)
        if (p){
          const colors = getColorOfParticipant(p)
          items.push(<DialogIconItem icon={kindIcon} onClick={onClick}>
              {startTimeStr}-{endTimeStr} &nbsp;
              <ImageAvatar size={24} border={true} name={p.name} avatarSrc={p.avatarSrc} colors={colors} />
              &nbsp; {p.name}
          </DialogIconItem>)
        }
      }else if (blob.cid){
        const c = conts.get(blob.cid)
        if (c){
          const typeIcon = contentTypeIcons(c.type, 24)
          items.push(<DialogIconItem icon={kindIcon} onClick={onClick}>
            {startTimeStr}-{endTimeStr}&nbsp;&nbsp;
            {typeIcon} &nbsp; {c.name} by {c.ownerName}
          </DialogIconItem>)
        }
      }
    };


    return (
      <>
      <Box>
        {player.title} &nbsp; ({timeToHourMinSec(duration)})
      </Box>
      <List>
        {...items}
      </List>
      </>
    )

  }else{
    return <></>
  }
}
RecordInfo.displayName = 'RecordInfo'
