import megaphoneIcon from '@iconify/icons-mdi/megaphone'
import {Icon} from '@iconify/react'
import {Tooltip} from '@material-ui/core'
import {makeStyles} from '@material-ui/core/styles'
import HeadsetIcon from '@material-ui/icons/HeadsetMic'
import MicOffIcon from '@material-ui/icons/MicOff'
import PlayArrowIcon from '@material-ui/icons/PlayArrow'
import RecordIcon from '@material-ui/icons/FiberManualRecord'
import SpeakerOffIcon from '@material-ui/icons/VolumeOff'
import {addV2, mulV2, normV, rotateVector2DByDegree, subV2} from '@models/utils'
import {LocalParticipant} from '@stores/participants/LocalParticipant'
import {PlaybackParticipant} from '@stores/participants/PlaybackParticipant'
import {RemoteParticipant} from '@stores/participants/RemoteParticipant'
import {participants} from '@stores/participants'
import {Observer} from 'mobx-react-lite'
import React from 'react'
import {SignalQualityIcon} from './SignalQuality'
import {VRMAvatar} from '../../avatar/VRMAvatar'
import { ComposedAvatar } from '@components/avatar/ComposedAvatar'

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
    width:0,
    height:0,
  }),
  pointerRotate: (props: StyleProps) => ({
    transformOrigin: `top left`,
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
    transformOrigin: `top left`,
    transform: `translate(${props.size * HALF}px, ${props.size * HALF}px) `
      +`rotate(${-props.orientation}deg) translate(${-props.size * HALF}px, ${-props.size * HALF}px)`,
  }),
  icon: (props: StyleProps) => ({
    position: 'absolute',
    width: props.size * 0.4 ,
    height: props.size * 0.4,
    left: props.size * 0.6,
    top: props.size * 0.6,
    pointerEvents: 'none',
  }),
  iconLeft: (props: StyleProps) => ({
    position: 'absolute',
    width: props.size * 0.4 ,
    height: props.size * 0.4,
    left: 0,
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
  size: number  //  constant
  participant: LocalParticipant | RemoteParticipant | PlaybackParticipant
  zIndex?: number
  isLocal?: boolean
  isPlayback?: boolean
  onContextMenu?:(ev:React.MouseEvent<HTMLDivElement, MouseEvent>) => void
}


export const Participant: React.FC<ParticipantProps> = (props) => {
  const participant = props.participant
  const classes = useStyles({
    position: participant.pose.position,
    orientation: participant.pose.orientation,
    size: props.size,
  })
  function getColor(){
    return participant ? participant.getColor() : ['white', 'black']
  }
  const outerRadius = props.size / 2 + 2
  const AUDIOLEVELSCALE = props.size * SVG_RATIO * HALF
  const svgCenter = SVG_RATIO * props.size * HALF


  const dir = subV2(participant.mouse.position, participant.mouse.position)
  const eyeDist = 0.45

  //const tailStart = noseStart
  //const tailLength = tailStart * 0.9
  //const tailWidth = 0.36
  function onClickEye(ev: React.MouseEvent | React.TouchEvent | React.PointerEvent){
    if (props.participant.id === participants.localId){
      ev.stopPropagation()
      ev.preventDefault()
      participants.local.physics.awayFromKeyboard = true
    }
  }
  const eyeClick = {
    onMouseDown: onClickEye,
    onTouchStart: onClickEye,
    onPointerDown: onClickEye,
  }

  const shadow = <Observer>{()=>{
    const shadowOffset = Math.sqrt(participant.viewpoint.height) / 2.5 - 4
    const shadowScale = 1 + (shadowOffset/200)

    return <svg className={classes.pointer} width={props.size * SVG_RATIO} height={props.size * SVG_RATIO}
    xmlns="http://www.w3.org/2000/svg">{/* Cast shadow to show the height */}
    <defs>
      <radialGradient id="grad">
        <stop offset="0%" stopColor="rgb(0,0,0,0.4)"/>
        <stop offset="70%" stopColor="rgb(0,0,0,0.4)"/>
        <stop offset="100%" stopColor="rgb(0,0,0,0)"/>
      </radialGradient>
    </defs>
    <circle r={outerRadius * shadowScale} cy={svgCenter-shadowOffset} cx={svgCenter-shadowOffset}
      stroke="none" fill={'url(#grad)'} />
  </svg>}}</Observer>

  const audioMeterSteps = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6]
  const audioMeter = <Observer>{()=>{
    const audioLevel = participant!.trackStates.micMuted ? 0 : Math.pow(participant!.audioLevel, 0.5)
    const [color] = getColor()

    return <>{
      audioMeterSteps.map(step => audioLevel > step ?
      <React.Fragment key={step}>
        <circle r={props.size * HALF + step * AUDIOLEVELSCALE} cy={svgCenter} cx={svgCenter}
          stroke={color} fill="none" opacity={0.4 * (1 - step)} strokeDasharray="4 4 4 24" />
        <circle r={props.size * HALF + step * AUDIOLEVELSCALE} cy={svgCenter} cx={svgCenter}
        stroke="black" fill="none" opacity={0.4 * (1 - step)} strokeDasharray="4 32" strokeDashoffset="-4" />
      </React.Fragment>
      : undefined)} </>
  }}</Observer>

  const arrowOuter = <Observer>{()=>{
    const [color, textColor] = getColor()

    return <g transform={`translate(${svgCenter} ${svgCenter}) rotate(-135) `}>
      <rect style={{pointerEvents: 'fill'}}
        height={outerRadius} width={outerRadius} fill={color} />
      {props.isLocal ?
        <path  d={`M 0 ${outerRadius} h ${outerRadius} v ${-outerRadius}` +
          `a ${outerRadius} ${outerRadius} 0 1 0 ${-outerRadius} ${outerRadius}`}
          fill="none" stroke={textColor} />
      : undefined}
    </g>}
  }</Observer>

  const frogOuter = <Observer>{()=>{
    const eyeOffsetMul = normV(participant.viewpoint.center)/500 * 0.16 + 0.85
    const eyeOffsets:[[number, number], [number, number]]
    = [[eyeDist * outerRadius, - eyeOffsetMul*outerRadius],
      [-eyeDist * outerRadius, - eyeOffsetMul*outerRadius]]
    const dirs = eyeOffsets.map(offset => subV2(dir, rotateVector2DByDegree(participant.pose.orientation, offset)))
    const eyeballsGlobal = dirs.map((dir) => {
      const norm = normV(dir)
      const dist = Math.log(norm < 1 ? 1 : norm) * 0.3
      const limit = 0.1 * outerRadius
      const offset = dist > limit ? limit : dist

      return mulV2(offset / norm, dir)
    })
    const eyeballs = eyeballsGlobal.map(g => addV2([0, -0.04 * outerRadius],
                                                    rotateVector2DByDegree(-participant.pose.orientation, g)))
    const [color] = getColor()

    return <g style={{pointerEvents: 'fill'}} >
    <circle {...eyeClick} r={0.35 * outerRadius} cy={svgCenter + eyeOffsets[0][1]}
      cx={svgCenter + eyeOffsets[0][0]} fill={color} />
    <circle {...eyeClick} r={0.35 * outerRadius} cy={svgCenter + eyeOffsets[1][1]}
      cx={svgCenter + eyeOffsets[1][0]} fill={color} />
    {participant.physics.awayFromKeyboard === true ?
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
  </g>  }}</Observer>

  const nose = <Observer>{()=>{
    const nodding = participant.viewpoint.nodding
    const noseWidth = 0.45
    const noseStart = 0.9 * (nodding ? Math.cos(nodding * 4) : 1)
    const noseLength = 0.6 * noseStart
    const [color, textColor] = getColor()

    return <path d={`M ${svgCenter-noseWidth*outerRadius/2} ${svgCenter-outerRadius*noseStart} `+
    `Q ${svgCenter} ${svgCenter-outerRadius*(noseStart+noseLength)}` +
    ` ${svgCenter+noseWidth*outerRadius/2} ${svgCenter-outerRadius*noseStart}`} stroke={textColor} fill={color} />}}
    </Observer>
  //const tail = <path d={`M ${svgCenter-tailWidth*outerRadius} ${svgCenter+outerRadius*tailStart}` +
  //  ` Q ${svgCenter} ${svgCenter+outerRadius*(tailStart+tailLength)}`+
  //  `  ${svgCenter+tailWidth*outerRadius} ${svgCenter+outerRadius*tailStart}`} stroke={textColor} fill={color} />
  const tail = undefined
  const circleOuter = undefined

  const avatarOuter =
    participant.information.avatar === 'arrow' ? arrowOuter: //  arrow (circle with a corner) type avatar
    participant.information.avatar === 'circle' ? circleOuter: frogOuter // Frog type (two eyes) avatar

  const outerUnder = <Observer>{()=>{
    const nodding = participant.viewpoint.nodding
    const isNoseUp = nodding ? nodding < -0.01 : false
    const [color, textColor] = getColor()

    return <svg
      className={classes.pointer} width={props.size * SVG_RATIO} height={props.size * SVG_RATIO} xmlns="http://www.w3.org/2000/svg">
      {nodding ? (isNoseUp ? tail : nose) : undefined}
      <circle r={outerRadius} cy={svgCenter} cx={svgCenter} stroke={props.isLocal ? textColor : 'none'} fill={color} />
      {audioMeter}
      {(!nodding || !isNoseUp) ? avatarOuter : undefined}
    </svg>}}</Observer>

  const outerOver = <Observer>{()=>{
    const nodding = participant.viewpoint.nodding
    const isNoseUp = nodding ? nodding < -0.01 : false

    return <svg
      className={classes.pointer} width={props.size * SVG_RATIO} height={props.size * SVG_RATIO} xmlns="http://www.w3.org/2000/svg">
      {isNoseUp ? avatarOuter: undefined}
      {nodding ? (isNoseUp ? nose : tail) : undefined}
    </svg>}}</Observer>


  return <>
    <div className={classes.root} style={{zIndex:props.isLocal ? 5000 : props.zIndex}}>
      {shadow}
      <Observer>{()=>{

        return <div className={classes.pointerRotate}>
          {outerUnder}
          <div className={classes.avatar + ' dragHandle'} onContextMenu={props.onContextMenu}>
            <Tooltip title={participant!.information.name}>
              <div>
                <ComposedAvatar participant={props.participant} mirror={props.isLocal} size={props.size}/>
                <SignalQualityIcon className={classes.signalIcon} quality={props.participant.quality} />
                {participant.trackStates.headphone ?
                  <HeadsetIcon className={classes.icon} htmlColor="rgba(0, 0, 0, 0.3)" /> : undefined}
                {participant.trackStates.speakerMuted ?
                  <SpeakerOffIcon className={classes.icon} color="secondary" /> :
                  (participant.trackStates.micMuted ? <MicOffIcon className={classes.icon} color="secondary" /> : undefined)}
                {!participant.trackStates.micMuted && participant.physics.onStage ?
                  <Icon className={classes.icon} icon={megaphoneIcon} color="gold" /> : undefined }
                {props.isPlayback ? <PlayArrowIcon className={classes.iconLeft} htmlColor="#0C0" /> : undefined}
                {participant.recording ? <RecordIcon className={classes.iconLeft} htmlColor="#D00" /> : undefined}
              </div>
            </Tooltip>
          </div>
          {outerOver}
        </div>
      }}</Observer>
    </div>
    <Observer>{()=>{
      const useVrm = participant.information.avatarSrc && participant.information.avatarSrc.slice(-4) === '.vrm'

      return useVrm ?
        <div className={classes.root} style={{zIndex:props.zIndex ? props.zIndex + 5000 : 10000}}>
          <VRMAvatar participant={participant} />
        </div> : <></>
    }}</Observer>
  </>
}
Participant.displayName = 'Participant'
