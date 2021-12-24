import {Avatar} from '@components/avatar'
import {Stores} from '@components/utils'
import megaphoneIcon from '@iconify/icons-mdi/megaphone'
import {Icon} from '@iconify/react'
import {Tooltip} from '@material-ui/core'
import {makeStyles} from '@material-ui/core/styles'
import HeadsetIcon from '@material-ui/icons/HeadsetMic'
import MicOffIcon from '@material-ui/icons/MicOff'
import PlayArrowIcon from '@material-ui/icons/PlayArrow'
import SpeakerOffIcon from '@material-ui/icons/VolumeOff'
import {addV2, mulV2, normV, rotateVector2DByDegree, subV2} from '@models/utils'
import {LocalParticipant} from '@stores/participants/LocalParticipant'
import { PlaybackParticipant } from '@stores/participants/PlaybackParticipant'
import {RemoteParticipant} from '@stores/participants/RemoteParticipant'
import {useObserver} from 'mobx-react-lite'
import React from 'react'
import {SignalQualityIcon} from './SignalQuality'
declare const config:any             //  from ../../config.js included from index.html

interface StyleProps {
  position: [number, number],
  orientation: number,
  size: number,
}

// const SVG_RATIO = 18
const SVG_RATIO = 12
const HALF = 0.5

const useStyles = makeStyles({
  root: (props: StyleProps) => ({
    position: 'absolute',
    left: props.position[0],
    top: props.position[1],
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
  avatar: (props: StyleProps) => ({
    position: 'absolute',
    left: `-${props.size * HALF}px`,
    top: `-${props.size * HALF}px`,
  }),
  icon: (props: StyleProps) => ({
    position: 'absolute',
    width: props.size * 0.4 ,
    height: props.size * 0.4,
    left: props.size * 0.6,
    top: props.size * 0.6,
    pointerEvents: 'none',
  }),
  signalIcon: (props: StyleProps) => ({
    position: 'absolute',
    width: props.size * 0.25 ,
    height: props.size * 0.25,
    left: props.size * 0.8,
    top: props.size * 0.8,
    pointerEvents: 'none',
  }),
  more: (props: StyleProps) => ({
    position: 'absolute',
    width: props.size * 0.4 ,
    height: props.size * 0.4,
    left: props.size * 0.9,
    top: -props.size * 0.3,
  }),
})

export interface ParticipantProps{
  participant: LocalParticipant | RemoteParticipant | PlaybackParticipant
  size: number
  onContextMenu?:(ev:React.MouseEvent<HTMLDivElement, MouseEvent>) => void
  stores: Stores
}
export interface RawParticipantProps extends ParticipantProps{
  isLocal: boolean
  isPlayback?: boolean
}

const RawParticipant: React.ForwardRefRenderFunction<HTMLDivElement , RawParticipantProps> = (props, ref) => {
  const mapData = props.stores.map
//  const participants = useStore()
  const participant = props.participant
  const participantProps = useObserver(() => ({
    position: participant.pose.position,
    orientation: participant.pose.orientation,
    mousePosition: participant.mouse.position,
    awayFromKeyboard: participant.physics.awayFromKeyboard,
  }))
  const name = useObserver(() => participant!.information.name)
  const audioLevel = useObserver(() =>
    participant!.trackStates.micMuted ? 0 : Math.pow(participant!.audioLevel, 0.5))
  // console.log(`audioLevel ${audioLevel}`)
  const micMuted = useObserver(() => participant.trackStates.micMuted)
  const speakerMuted = useObserver(() => participant.trackStates.speakerMuted)
  const headphone = useObserver(() => participant.trackStates.headphone)
  const onStage = useObserver(() => participant.physics.onStage)
  const viewpoint = useObserver(() => ({center:participant.viewpoint.center, height:participant.viewpoint.height}))

  const classes = useStyles({
    ...participantProps,
    size: props.size,
  })

  const [color, textColor] = participant ? participant.getColor() : ['white', 'black']
  const outerRadius = props.size / 2 + 2
  const isLocal = props.isLocal
  const AUDIOLEVELSCALE = props.size * SVG_RATIO * HALF
  const svgCenter = SVG_RATIO * props.size * HALF

  const shadowOffset = Math.sqrt(viewpoint.height) / 2.5 - 4
  const shadowScale = 1 + (shadowOffset/200)
  const eyeOffsetMul = normV(viewpoint.center)/500 * 0.16 + 0.85

  const dir = subV2(participantProps.mousePosition, participantProps.position)
  const eyeDist = 0.4
  const eyeOffsets:[[number, number], [number, number]]
    = [[eyeDist * outerRadius, - eyeOffsetMul*outerRadius],
      [-eyeDist * outerRadius, - eyeOffsetMul*outerRadius]]
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
  function onClickEye(ev: React.MouseEvent | React.TouchEvent | React.PointerEvent){
    if (props.participant.id === props.stores.participants.localId){
      ev.stopPropagation()
      ev.preventDefault()
      props.stores.participants.local.physics.awayFromKeyboard = true
    }
  }
  const eyeClick = {
    onMouseDown: onClickEye,
    onTouchStart: onClickEye,
    onPointerDown: onClickEye,
  }

  const audioMeterSteps = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6]
  const audioMeter = audioMeterSteps.map(step => audioLevel > step ?
    <React.Fragment key={step}>
      <circle r={props.size * HALF + step * AUDIOLEVELSCALE} cy={svgCenter} cx={svgCenter}
        stroke={color} fill="none" opacity={0.4 * (1 - step)} strokeDasharray="4 4 4 24" />
      <circle r={props.size * HALF + step * AUDIOLEVELSCALE} cy={svgCenter} cx={svgCenter}
      stroke="black" fill="none" opacity={0.4 * (1 - step)} strokeDasharray="4 32" strokeDashoffset="-4" />
    </React.Fragment>
    : undefined)

  return (
    <div className={classes.root + ' dragHandle'} onContextMenu={props.onContextMenu}>
      <svg className={classes.pointer} width={props.size * SVG_RATIO} height={props.size * SVG_RATIO}
        xmlns="http://www.w3.org/2000/svg">{/* Cast shadow to show the height */}
        <defs>
          <radialGradient id="grad">
            <stop offset="0%" stopColor="rgb(0,0,0,0.4)"/>
            <stop offset="70%" stopColor="rgb(0,0,0,0.4)"/>
            <stop offset="100%" stopColor="rgb(0,0,0,0)"/>
          </radialGradient>
        </defs>
        <circle r={outerRadius * shadowScale} cy={svgCenter+shadowOffset} cx={svgCenter+shadowOffset}
          stroke="none" fill={'url(#grad)'} />
      </svg>
      <div className={classes.pointerRotate}>{/* The avatar */}
        <svg
          className={classes.pointer} width={props.size * SVG_RATIO} height={props.size * SVG_RATIO} xmlns="http://www.w3.org/2000/svg">
          <circle r={outerRadius} cy={svgCenter} cx={svgCenter} stroke="none" fill={color} />
          {audioMeter}
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
              <circle {...eyeClick} r={0.35 * outerRadius} cy={svgCenter + eyeOffsets[0][1]}
                cx={svgCenter + eyeOffsets[0][0]} fill={color} />
              <circle {...eyeClick} r={0.35 * outerRadius} cy={svgCenter + eyeOffsets[1][1]}
                cx={svgCenter + eyeOffsets[1][0]} fill={color} />
              {participantProps.awayFromKeyboard === true ?
                undefined
              :<>
                <circle {...eyeClick} r={0.25 * outerRadius} cy={svgCenter + eyeOffsets[0][1]}
                  cx={svgCenter + eyeOffsets[0][0]} fill="white" />
                <circle {...eyeClick} r={0.25 * outerRadius} cy={svgCenter + eyeOffsets[1][1]}
                  cx={svgCenter + eyeOffsets[1][0]} fill="white" />
                <circle {...eyeClick} r={0.14 * outerRadius} cy={svgCenter + eyeOffsets[0][1] + eyeballs[0][1]}
                  cx={svgCenter + eyeOffsets[0][0] +  eyeballs[0][0]} fill="black" />
                <circle {...eyeClick} r={0.14 * outerRadius} cy={svgCenter + eyeOffsets[1][1] + eyeballs[1][1]}
                  cx={svgCenter + eyeOffsets[1][0] +  eyeballs[1][0]} fill="black" />
              </>}
            </g>
          }
        </svg>
      </div>
      <div className={classes.avatar}
        style = {{transform: `rotate(${-mapData.rotation}deg)`}} >
        <Tooltip title={name}>
          <div>
            <Avatar {...props} />
            <SignalQualityIcon className={classes.signalIcon} quality={participant.quality?.connectionQuality} />
            {headphone ? <HeadsetIcon className={classes.icon} htmlColor="rgba(0, 0, 0, 0.3)" /> : undefined}
            {speakerMuted ? <SpeakerOffIcon className={classes.icon} color="secondary" /> :
              (micMuted ? <MicOffIcon className={classes.icon} color="secondary" /> : undefined)}
            {!micMuted && onStage ? <Icon className={classes.icon} icon={megaphoneIcon} color="gold" /> : undefined }
            {props.isPlayback ? <PlayArrowIcon className={classes.icon} htmlColor="#0C0" /> : undefined}
          </div>
        </Tooltip>
      </div>
    </div>
  )
}
RawParticipant.displayName = 'RawParticipant'

//export const Participant = forwardRef(RawParticipant)
//Participant.displayName = 'Participant'

export const Participant = (props: RawParticipantProps) =>
  React.useMemo(() => <RawParticipant {...props} />,
  //  eslint-disable-next-line react-hooks/exhaustive-deps
  [props.size, props.participant.id,
    props.participant.information.avatarSrc,
    props.participant.information.color,
    props.participant.information.name,
    props.participant.information.textColor,
  ])
Participant.displayName = 'MemorizedParticipant'
