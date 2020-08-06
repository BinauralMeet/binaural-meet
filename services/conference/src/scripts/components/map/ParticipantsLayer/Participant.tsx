import {Avatar, AvatarProps} from '@components/avatar'
import {LOCAL_PARTICIPANT_CONFIG} from '@components/configuration/plugin/plugins/LocalParticipantConfig'
import {REMOTE_PARTICIPANT_CONFIG} from '@components/configuration/plugin/plugins/RemoteParticipantConfig'
import {useStore} from '@hooks/ParticipantsStore'
import {memoComponent} from '@hooks/utils'
import {Tooltip} from '@material-ui/core'
import {makeStyles} from '@material-ui/core/styles'
import {useObserver} from 'mobx-react-lite'
import React, {forwardRef, useState} from 'react'
import {MapObjectContainer} from '../utils/MapObjectContainer'
import {useValue as useTransform} from '../utils/useTransform'
import Pointer from './Pointer.svg'

const pointerAvatarRatio = 2

interface StyleProps {
  position: [number, number],
  orientation: number,
  size: number,
}

const useStyles = makeStyles({
  avatar: (props: StyleProps) => ({
    position: 'absolute',
    left: `-${props.size / 2}px`,
    top: `-${props.size / 2}px`,
  }),
  pointerRotate: (props: StyleProps) => ({
    transform: `rotate(${props.orientation}deg)`,
  }),
  pointer: (props: StyleProps) => ({
    position: 'absolute',
    width: `${pointerAvatarRatio * props.size / 2}`,
    left: `-${pointerAvatarRatio * props.size / 2}px`,
    top: `-${pointerAvatarRatio * props.size / 2}px`,
  }),
})

export type ParticipantProps = Required<AvatarProps>

const RawParticipant: React.ForwardRefRenderFunction<HTMLDivElement , ParticipantProps> = (props, ref) => {
  const participants = useStore()
  const participant = participants.find(props.participantId)
  const participantProps = useObserver(() => ({
    position: participant.pose.position,
    orientation: participant.pose.orientation,
  }))
  const name = useObserver(() => participant.information.name)

  const classes = useStyles({
    ...participantProps,
    size: props.size,
  })

  const transform = useTransform()
  const [color, fcolor] = participant.getColor()

  return (
      <MapObjectContainer pose={participantProps} ref={ref} disableRotation={true}
        configurationPluginName={participants.isLocal(props.participantId) ?
          LOCAL_PARTICIPANT_CONFIG : REMOTE_PARTICIPANT_CONFIG}
        buttonSpacing={{
          top: -pointerAvatarRatio * props.size / 2,
          right: -pointerAvatarRatio * props.size / 2,
        }}
        counterRotateButtons={true}
      >
          <div className="participantWrapper" style={{filter: `drop-shadow(3px 3px 3px ${color})`}}>
            <div className={classes.pointerRotate}>
              <Pointer className={classes.pointer} />
            </div>
            <Tooltip title={name}>
              <div className={[classes.avatar, transform.counterRotationClass, 'draggableHandle'].join(' ')}>
                <Avatar {...props} />
              </div>
            </Tooltip>
          </div>
      </MapObjectContainer >
  )
}

export const Participant = forwardRef(RawParticipant)
Participant.displayName = 'Participant'

export const MemoedParticipant = memoComponent(Participant, ['participantId', 'size'])
MemoedParticipant.displayName = 'MemorizedParticipant'
