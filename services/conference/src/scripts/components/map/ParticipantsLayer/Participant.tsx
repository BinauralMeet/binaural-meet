import {Avatar, AvatarProps} from '@components/avatar'
import {ConfigurationDialog, resolveConfigurationPlugin} from '@components/configuration'
import {LOCAL_PARTICIPANT_CONFIG} from '@components/configuration/plugin/plugins/LocalParticipantConfig'
import {useStore} from '@hooks/ParticipantsStore'
import {memoComponent} from '@hooks/utils'
import ClickAwayListener from '@material-ui/core/ClickAwayListener'
import {makeStyles} from '@material-ui/core/styles'
import {event} from 'jquery'
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
  const classes = useStyles({
    ...participantProps,
    size: props.size,
  })

  const transform = useTransform()

  const [showConfig, setShowConfig] = useState<boolean>(false)
  const [dialogPosition, setDialogPosition] = useState<[number, number]>([0, 0])
  const ConfigurationPlugin = resolveConfigurationPlugin(LOCAL_PARTICIPANT_CONFIG)
  const configuration = (
    <ConfigurationDialog position={dialogPosition}>
        <ConfigurationPlugin />
    </ConfigurationDialog>
  )

  return (
    <ClickAwayListener onClickAway={() => setShowConfig(false)}>
      <MapObjectContainer pose={participantProps} ref={ref} disableRotation={true}
        openConfiuration={(event) => {
          setShowConfig(true)
          setDialogPosition([event.clientX, event.clientY])
        }}
        buttonSpacing={{
          top: -pointerAvatarRatio * props.size / 2,
          right: -pointerAvatarRatio * props.size / 2,
        }}
        counterRotateButtons={true}
      >
          <div className="participantWrapper">
            <div className={classes.pointerRotate}>
              <Pointer className={classes.pointer} />
            </div>
            <div className={[classes.avatar, transform.counterRotationClass, 'draggableHandle'].join(' ')}>
              <Avatar {...props} />
            </div>
          </div>
          {showConfig ? configuration : null}
      </MapObjectContainer >
    </ClickAwayListener>
  )
}

export const Participant = forwardRef(RawParticipant)
Participant.displayName = 'Participant'

export const MemoedParticipant = memoComponent(Participant, ['participantId', 'size'])
MemoedParticipant.displayName = 'MemorizedParticipant'
