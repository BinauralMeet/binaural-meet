import {Avatar, AvatarProps} from '@components/avatar'
import {LOCAL_PARTICIPANT_CONFIG} from '@components/configuration/plugin/plugins/LocalParticipantConfig'
import {useStore} from '@hooks/ParticipantsStore'
import {memoComponent} from '@hooks/utils'
import megaphoneIcon from '@iconify/icons-mdi/megaphone'
import {Icon} from '@iconify/react'
import {Tooltip} from '@material-ui/core'
import {makeStyles} from '@material-ui/core/styles'
import HeadsetIcon from '@material-ui/icons/HeadsetMic'
import MicOffIcon from '@material-ui/icons/MicOff'
import SpeakerOffIcon from '@material-ui/icons/VolumeOff'
import {addV2, mulV2, normV, rotateVector2DByDegree, subV2} from '@models/utils'
import {useObserver} from 'mobx-react-lite'
import React, {forwardRef} from 'react'
import {MapObjectContainer} from '../utils/MapObjectContainer'
import {useValue as useTransform} from '../utils/useTransform'
declare const config:any             //  from ../../config.js included from index.html

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
  icon: (props: StyleProps) => ({
    position: 'absolute',
    width: props.size * 0.4 ,
    height: props.size * 0.4,
    left: props.size * 0.1,
    top: props.size * 0.1,
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
    mousePosition: participant!.mouse.position,
  }))
  const name = useObserver(() => participant!.information.name)
  const audioLevel = useObserver(() => Math.pow(participant!.tracks.audioLevel, 0.5))
  // console.log(`audioLevel ${audioLevel}`)
  const micMuted = useObserver(() => participant?.trackStates.micMuted)
  const speakerMuted = useObserver(() => participant?.trackStates.speakerMuted)
  const headphone = useObserver(() => participant?.trackStates.headphone)
  const onStage = useObserver(() => participant?.physics.onStage)

  const classes = useStyles({
    ...participantProps,
    size: props.size,
  })

  const transform = useTransform()
  const [color, textColor, revColor] = participant ? participant.getColor() : ['white', 'black']
  const outerRadius = props.size / 2 + 2
  const isLocal = participants.isLocal(props.participantId)
  const AUDIOLEVELSCALE = props.size * SVG_RATIO * HALF
  const svgCenter = SVG_RATIO * props.size * HALF

  const dir = subV2(participantProps.mousePosition, participantProps.position)
  const eyeOffsets:[[number, number], [number, number]]
    = [[0.4 * outerRadius, -outerRadius], [-0.4 * outerRadius, -outerRadius]]
  const dirs = eyeOffsets.map(offset => subV2(dir, rotateVector2DByDegree(participantProps.orientation, offset)))
  const eyeballsGlobal = dirs.map((dir) => {
    const norm = normV(dir)
    const dist = Math.log(norm < 1 ? 1 : norm) * 0.3
    const limit = 0.1 * outerRadius
    const offset = dist > limit ? limit : dist

    return mulV2(offset / norm, dir)
  })
  const eyeballs = eyeballsGlobal.map(g => addV2([0, -0.04 * outerRadius],
                                                 rotateVector2DByDegree(-participantProps.orientation, g)))

  return (
    <MapObjectContainer pose={participantProps} ref={ref} disableRotation={true} color={color}
      //  configurationPluginName={isLocal ? LOCAL_PARTICIPANT_CONFIG : REMOTE_PARTICIPANT_CONFIG}
      //  currently we have no configulatoin for remote paritcipants
      configurationPluginName={isLocal ? LOCAL_PARTICIPANT_CONFIG : undefined}
      buttonSpacing={{
        top: - props.size * HALF - 20,
        right: - props.size * HALF - 20,
      }}
      counterRotateButtons={true}
    >
      <div className={classes.pointerRotate}>
        <svg className={classes.pointer} width={props.size * SVG_RATIO} height={props.size * SVG_RATIO} xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id={`gr${props.participantId}`}>
              <stop offset="0%" stopColor={color} stopOpacity={audioLevel} />
              <stop offset="15%" stopColor={color} stopOpacity={0.5 * audioLevel} />
              <stop offset="35%" stopColor={color} stopOpacity={0.4 * (audioLevel > 0.5 ? audioLevel - 0.5 : 0)} />
              <stop offset="60%" stopColor={color} stopOpacity={0.4 * (audioLevel > 0.7 ? audioLevel - 0.7 : 0)} />
              <stop offset="100%" stopColor={color} stopOpacity={0.1 * (audioLevel > 0.7 ? audioLevel - 0.7 : 0)} />
            </radialGradient>
          </defs>
          <circle r={AUDIOLEVELSCALE}
            cy={svgCenter} cx={svgCenter} fill={`url(#gr${props.participantId})`} />
          <circle r={outerRadius} cy={svgCenter} cx={svgCenter} fill={color}
            style={{pointerEvents: 'fill'}} />
          {config.avatar === 'arrow' ?  //  arrow (circle with a corner) type avatar
            <g transform={`translate(${svgCenter} ${svgCenter}) rotate(-135) `}>
              <rect style={{pointerEvents: 'fill'}}
                height={outerRadius} width={outerRadius} fill={color} />
              {isLocal ?
                <path  d={`M 0 ${outerRadius} h ${outerRadius} v ${-outerRadius}` +
                  `a ${outerRadius} ${outerRadius} 0 1 0 ${-outerRadius} ${outerRadius}`}
                  fill="none" stroke={textColor} />
                : undefined}
            </g>
            : // Frog type (two eyes) avatar
            <g style={{pointerEvents: 'fill'}} >
              {isLocal ?
                <circle r={outerRadius} cy={svgCenter} cx={svgCenter} fill="none" stroke={textColor} />
                : undefined}
              <circle r={0.35 * outerRadius} cy={svgCenter + eyeOffsets[0][1]}
                cx={svgCenter + eyeOffsets[0][0]} fill={color} />
              <circle r={0.35 * outerRadius} cy={svgCenter + eyeOffsets[1][1]}
                cx={svgCenter + eyeOffsets[1][0]} fill={color} />
              <circle r={0.25 * outerRadius} cy={svgCenter + eyeOffsets[0][1]}
                cx={svgCenter + eyeOffsets[0][0]} fill="white" />
              <circle r={0.25 * outerRadius} cy={svgCenter + eyeOffsets[1][1]}
                cx={svgCenter + eyeOffsets[1][0]} fill="white" />
              <circle r={0.14 * outerRadius} cy={svgCenter + eyeOffsets[0][1] + eyeballs[0][1]}
                cx={svgCenter + eyeOffsets[0][0] +  eyeballs[0][0]} fill="black" />
              <circle r={0.14 * outerRadius} cy={svgCenter + eyeOffsets[1][1] + eyeballs[1][1]}
                cx={svgCenter + eyeOffsets[1][0] +  eyeballs[1][0]} fill="black" />
            </g>
          }
        </svg>
      </div>
      <Tooltip title={<span>{name}<br />{props.participantId}</span>}>
        <div className={[classes.avatar, transform.counterRotationClass, 'draggableHandle'].join(' ')}>
            <Avatar {...props} />
        </div>
    </Tooltip>
    {headphone ? <HeadsetIcon className={classes.icon} htmlColor="rgba(0, 0, 0, 0.3)" /> : undefined}
    {speakerMuted ? <SpeakerOffIcon className={classes.icon} color="secondary" /> :
      (micMuted ? <MicOffIcon className={classes.icon} color="secondary" /> : undefined)}
    {!micMuted && onStage ? <Icon className={classes.icon} icon={megaphoneIcon} color="gold" /> : undefined }

    </MapObjectContainer >
  )
}

export const Participant = forwardRef(RawParticipant)
Participant.displayName = 'Participant'

export const MemoedParticipant = memoComponent(Participant, ['participantId', 'size'])
MemoedParticipant.displayName = 'MemorizedParticipant'
