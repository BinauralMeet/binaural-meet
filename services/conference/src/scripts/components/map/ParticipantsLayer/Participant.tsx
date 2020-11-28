import {Avatar, AvatarProps} from '@components/avatar'
import {LOCAL_PARTICIPANT_CONFIG} from '@components/configuration/plugin/plugins/LocalParticipantConfig'
import {useStore} from '@hooks/ParticipantsStore'
import {memoComponent} from '@hooks/utils'
import {Tooltip} from '@material-ui/core'
import {makeStyles} from '@material-ui/core/styles'
import {useObserver} from 'mobx-react-lite'
import React, {forwardRef} from 'react'
import {MapObjectContainer} from '../utils/MapObjectContainer'
import {useValue as useTransform} from '../utils/useTransform'
interface StyleProps {
  position: [number, number],
  orientation: number,
  size: number,
}

const SVG_RATIO = 18
const HALF = 0.5

const useStyles = makeStyles({
  avatar: (props: StyleProps) => ({
    position: 'absolute',
    left: `-${props.size * HALF}px`,
    top: `-${props.size * HALF}px`,
  }),
  pointerRotate: (props: StyleProps) => ({
    transform: `rotate(${props.orientation}deg)`,
  }),
  pointer: (props: StyleProps) => ({
    position: 'absolute',
    width: `${SVG_RATIO * props.size}`,
    left: `-${SVG_RATIO * props.size * HALF}px`,
    top: `-${SVG_RATIO * props.size * HALF}px`,
    pointerEvents: 'none',
  }),
})

export type ParticipantProps = Required<AvatarProps>

const RawParticipant: React.ForwardRefRenderFunction<HTMLDivElement , ParticipantProps> = (props, ref) => {
  const participants = useStore()
  const participant = participants.find(props.participantId)
  const participantProps = useObserver(() => ({
    position: participant!.pose.position,
    orientation: participant!.pose.orientation,
  }))
  const name = useObserver(() => participant!.information.name)
  const audioLevel = useObserver(() => participant!.tracks.audioLevel)
  // console.log(`audioLevel ${audioLevel}`)

  const classes = useStyles({
    ...participantProps,
    size: props.size,
  })

  const transform = useTransform()
  const [color, textColor, revColor] = participant ? participant.getColor() : ['white', 'black']
  // tslint:disable-next-line: no-magic-numbers
  const outerRadius = props.size / 2 + 2
  const isLocal = participants.isLocal(props.participantId)
  const AUDIOLEVELSCALE = props.size * SVG_RATIO * HALF
  const svgCenter = SVG_RATIO * props.size * HALF

  return (
    <MapObjectContainer pose={participantProps} ref={ref} disableRotation={true} color={color}
      //  configurationPluginName={isLocal ? LOCAL_PARTICIPANT_CONFIG : REMOTE_PARTICIPANT_CONFIG}
      //  currently we have no configulatoin for remote paritcipants
      configurationPluginName={isLocal ? LOCAL_PARTICIPANT_CONFIG : undefined}
      buttonSpacing={{
        // tslint:disable-next-line: no-magic-numbers
        top: - props.size * HALF - 20,
        // tslint:disable-next-line: no-magic-numbers
        right: - props.size * HALF - 20,
      }}
      counterRotateButtons={true}
    >
      <div className={classes.pointerRotate}>
        <svg className={classes.pointer} width={props.size * SVG_RATIO} height={props.size * SVG_RATIO} xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id={`gr${props.participantId}`}>
              <stop offset="0%" stopColor={color} stopOpacity={audioLevel} />
              <stop offset="20%" stopColor={color} stopOpacity={0.5 * audioLevel} />
              <stop offset="60%" stopColor={color} stopOpacity={0.4 * (audioLevel > 0.5 ? audioLevel - 0.5 : 0)} />
              <stop offset="100%" stopColor={color} stopOpacity={0.1 * (audioLevel > 0.5 ? audioLevel - 0.5 : 0)} />
            </radialGradient>
          </defs>
          <circle r={AUDIOLEVELSCALE}
            cy={svgCenter} cx={svgCenter} fill={`url(#gr${props.participantId})`} />
          <circle r={outerRadius} cy={svgCenter} cx={svgCenter} fill={color}
            style={{pointerEvents: 'fill'}} />
          <g transform={`translate(${svgCenter} ${svgCenter}) rotate(-135) `}>
            <rect style={{pointerEvents: 'fill'}}
              height={outerRadius} width={outerRadius} fill={color} />
            {isLocal ?
              <path  d={`M 0 ${outerRadius} h ${outerRadius} v ${-outerRadius}` +
                `a ${outerRadius} ${outerRadius} 0 1 0 ${-outerRadius} ${outerRadius}`}
                 fill="none" stroke={textColor} />
              : undefined}
          </g>
        </svg>
      </div>
      <Tooltip title={`${name} ${props.participantId}`}>
        <div className={[classes.avatar, transform.counterRotationClass, 'draggableHandle'].join(' ')}>
            <Avatar {...props} />
        </div>
      </Tooltip>
    </MapObjectContainer >
  )
}

export const Participant = forwardRef(RawParticipant)
Participant.displayName = 'Participant'

export const MemoedParticipant = memoComponent(Participant, ['participantId', 'size'])
MemoedParticipant.displayName = 'MemorizedParticipant'
