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
import { ComposedAvatar } from '@components/avatar/ComposedAvatar'
import _ from 'lodash'

const renderLog = false ? console.log : (..._:any)=>{}


interface StylePropsPose {
  position: [number, number],
  orientation: number,
  size: number,
}
interface StylePropsSize {
  size: number,
}
// const SVG_RATIO = 18
const SVG_RATIO = 12
const HALF = 0.5

const useStylesWithPose = makeStyles({
  root: (props: StylePropsPose) => ({
    position: 'absolute',
    left: props.position[0],
    top: props.position[1],
    width:0,
    height:0,
  }),
  pointerRotate: (props: StylePropsPose) => ({
    transformOrigin: `top left`,
    transform: `rotate(${props.orientation}deg)`,
  }),
  avatar: (props: StylePropsPose) => ({
    position: 'absolute',
    left: `-${props.size * HALF}px`,
    top: `-${props.size * HALF}px`,
    transformOrigin: `top left`,
    transform: `translate(${props.size * HALF}px, ${props.size * HALF}px) `
      +`rotate(${-props.orientation}deg) translate(${-props.size * HALF}px, ${-props.size * HALF}px)`,
  }),
})

const useStylesWithSize = makeStyles({
  pointer: (props: StylePropsSize) => ({
    position: 'absolute',
    width: `${SVG_RATIO * props.size}`,
    left: `-${SVG_RATIO * props.size * HALF}px`,
    top: `-${SVG_RATIO * props.size * HALF}px`,
    pointerEvents: 'none',
  }),
  icon: (props: StylePropsSize) => ({
    position: 'absolute',
    width: props.size * 0.4 ,
    height: props.size * 0.4,
    left: props.size * 0.6,
    top: props.size * 0.6,
    pointerEvents: 'none',
  }),
  iconLeft: (props: StylePropsSize) => ({
    position: 'absolute',
    width: props.size * 0.4 ,
    height: props.size * 0.4,
    left: 0,
    top: props.size * 0.6,
    pointerEvents: 'none',
  }),
  signalIcon: (props: StylePropsSize) => ({
    position: 'absolute',
    width: props.size * 0.25 ,
    height: props.size * 0.25,
    left: props.size * 0.8,
    top: props.size * 0.8,
    pointerEvents: 'none',
  }),
})

type AnyParticipant = LocalParticipant | RemoteParticipant | PlaybackParticipant
interface BasicProps{
  participant: AnyParticipant
  size: number
}
interface OuterProps extends BasicProps{
  isLocal?: boolean
}
interface MainAvatarProps extends BasicProps{
  isLocal?: boolean
  isPlayback?: boolean
  onContextMenu?:(ev:React.MouseEvent<HTMLDivElement, MouseEvent>) => void
}
export interface ParticipantProps extends MainAvatarProps{
  zIndex?: number
}



function getColor(participant:LocalParticipant|RemoteParticipant|PlaybackParticipant){
  return participant ? participant.getColor() : ['white', 'black']
}
function calcOuterRadius(props:{size:number}){
  return props.size / 2 + 2
}
function calcSvgCenter(props:{size:number}){
  return SVG_RATIO * props.size * HALF
}

const audioMeterSteps = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6]
export const AudioMeter: React.FC<BasicProps> = React.memo( (props) => {
  const participant = props.participant
  const AUDIOLEVELSCALE = props.size * SVG_RATIO * HALF
  const svgCenter = calcSvgCenter(props)

  return <Observer>{()=>{
    renderLog(`${participant.id} audioMeter`)
    const audioLevel = participant!.trackStates.micMuted ? 0 : Math.pow(participant!.audioLevel, 0.5)
    const [color] = getColor(participant)

    return <>{
      audioMeterSteps.map(step => audioLevel > step ?
      <React.Fragment key={step}>
        <circle r={props.size * HALF + step * AUDIOLEVELSCALE} cy={svgCenter} cx={svgCenter}
          stroke={color} fill="none" opacity={0.4 * (1 - step)} strokeDasharray="4 4 4 24" />
        <circle r={props.size * HALF + step * AUDIOLEVELSCALE} cy={svgCenter} cx={svgCenter}
        stroke="black" fill="none" opacity={0.4 * (1 - step)} strokeDasharray="4 32" strokeDashoffset="-4" />
      </React.Fragment>
      : undefined)} </>
    }}
  </Observer>
})

export const AvatarOuter: React.FC<OuterProps> = React.memo((props)=>{
  const svgCenter = calcSvgCenter(props)
  const outerRadius = calcOuterRadius(props)
  const participant = props.participant
  const circleOuter = <></>

  const arrowOuter = <Observer>{()=>{
    renderLog(`${participant.id} arrowOuter`)
    const [color, textColor] = getColor(participant)

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

  const eyeDist = 0.45
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
  const frogOuter = <Observer>{()=>{
    renderLog(`${participant.id} ${participant.physics.awayFromKeyboard ? 'AFK' : ''} frogOuter`)
    const eyeOffsetMul = normV(participant.viewpoint.center)/500 * 0.16 + 0.85
    const eyeOffsets:[[number, number], [number, number]]
    = [[eyeDist * outerRadius, - eyeOffsetMul*outerRadius],
      [-eyeDist * outerRadius, - eyeOffsetMul*outerRadius]]
    const [color] = getColor(participant)

    return <g style={{pointerEvents: 'fill'}} >
    <circle {...eyeClick} r={0.35 * outerRadius} cy={svgCenter + eyeOffsets[0][1]}
      cx={svgCenter + eyeOffsets[0][0]} fill={color} />
    <circle {...eyeClick} r={0.35 * outerRadius} cy={svgCenter + eyeOffsets[1][1]}
      cx={svgCenter + eyeOffsets[1][0]} fill={color} />
    {participant.physics.awayFromKeyboard === true ?
      undefined:
      <>
        <circle {...eyeClick} r={0.25 * outerRadius} cy={svgCenter + eyeOffsets[0][1]}
          cx={svgCenter + eyeOffsets[0][0]} fill="white" />
        <circle {...eyeClick} r={0.25 * outerRadius} cy={svgCenter + eyeOffsets[1][1]}
          cx={svgCenter + eyeOffsets[1][0]} fill="white" />

        <Observer>{()=>{
          renderLog(`${participant.id} eyeball`)
          const dir = subV2(participant.mouse.position, participant.pose.position)
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
          return <>
            <circle {...eyeClick} r={0.14 * outerRadius} cy={svgCenter + eyeOffsets[0][1] + eyeballs[0][1]}
              cx={svgCenter + eyeOffsets[0][0] +  eyeballs[0][0]} fill="black" />
            <circle {...eyeClick} r={0.14 * outerRadius} cy={svgCenter + eyeOffsets[1][1] + eyeballs[1][1]}
              cx={svgCenter + eyeOffsets[1][0] +  eyeballs[1][0]} fill="black" />
          </>}}</Observer>
      </>
    }
  </g>  }}</Observer>

  return <>{ participant.information.avatar === 'arrow' ? arrowOuter: //  arrow (circle with a corner) type avatar
    participant.information.avatar === 'circle' ? circleOuter: frogOuter // Frog type (two eyes) avatar
    }</>
})

const Nose: React.FC<OuterProps> = (props)=>{
  const svgCenter = calcSvgCenter(props)
  const outerRadius = calcOuterRadius(props)
  const participant = props.participant

  return <Observer>{()=>{
    renderLog(`${participant.id} nose`)
    const nodding = participant.viewpoint.nodding
    const noseWidth = 0.45
    const noseStart = 0.9 * (nodding ? Math.cos(nodding * 4) : 1)
    const noseLength = 0.6 * noseStart
    const [color, textColor] = getColor(participant)

    return <path d={`M ${svgCenter-noseWidth*outerRadius/2} ${svgCenter-outerRadius*noseStart} `+
    `Q ${svgCenter} ${svgCenter-outerRadius*(noseStart+noseLength)}` +
    ` ${svgCenter+noseWidth*outerRadius/2} ${svgCenter-outerRadius*noseStart}`} stroke={textColor} fill={color} />}}
  </Observer>
}
const Tail: React.FC = ()=>{
  //const tailStart = noseStart
  //const tailLength = tailStart * 0.9
  //const tailWidth = 0.36
  //const tail = <path d={`M ${svgCenter-tailWidth*outerRadius} ${svgCenter+outerRadius*tailStart}` +
  //  ` Q ${svgCenter} ${svgCenter+outerRadius*(tailStart+tailLength)}`+
  //  `  ${svgCenter+tailWidth*outerRadius} ${svgCenter+outerRadius*tailStart}`} stroke={textColor} fill={color} />
  return <></>
}

const OuterUnder: React.FC<OuterProps> = React.memo((props)=>{
  const classesSize = useStylesWithSize({
    size: props.size
  })
  const svgCenter = calcSvgCenter(props)
  const outerRadius = calcOuterRadius(props)
  const participant = props.participant

  return <Observer>{()=>{
    renderLog(`${participant.id} outerUnder`)
    const nodding = participant.viewpoint.nodding
    const isNoseUp = nodding ? nodding < -0.01 : false
    const [color, textColor] = getColor(participant)

    return <svg
      className={classesSize.pointer} width={props.size * SVG_RATIO} height={props.size * SVG_RATIO} xmlns="http://www.w3.org/2000/svg">
      {nodding ? (isNoseUp ? <Tail /> : <Nose {...props}/>) : undefined}
      <circle r={outerRadius} cy={svgCenter} cx={svgCenter} stroke={props.isLocal ? textColor : 'none'} fill={color} />
      <AudioMeter size={props.size} participant={props.participant}/>
      {(!nodding || !isNoseUp) ? <AvatarOuter {...props}/> : undefined}
    </svg>}}</Observer>
})

const OuterOver: React.FC<OuterProps> = React.memo((props) => {
  const participant = props.participant
  const classesSize = useStylesWithSize({
    size: props.size
  })

  return <Observer>{()=>{
    renderLog(`${participant.id} outerOver`)
    const nodding = participant.viewpoint.nodding
    if (nodding){
      const isNoseUp = nodding ? nodding < -0.01 : false

      return <svg
        className={classesSize.pointer} width={props.size * SVG_RATIO} height={props.size * SVG_RATIO} xmlns="http://www.w3.org/2000/svg">
        {isNoseUp ? <AvatarOuter {...props} />: undefined}
        {nodding ? (isNoseUp ? <Nose {...props}/> : <Tail />) : undefined}
      </svg>
    }
    return <></>
  }}</Observer>
})

const MainAvatar: React.FC<MainAvatarProps> = React.memo((props) => {
  const participant = props.participant
  renderLog(`${participant.id} MainAvatar`)
  const classesSize = useStylesWithSize({
    size: props.size
  })

  return <Observer>{()=>
    <Tooltip title={participant!.information.name}>
      <div>
        <ComposedAvatar participant={props.participant} mirror={props.isLocal} size={props.size}/>
        <SignalQualityIcon className={classesSize.signalIcon} quality={props.participant.quality} />
        {participant.trackStates.headphone ?
          <HeadsetIcon className={classesSize.icon} htmlColor="rgba(0, 0, 0, 0.3)" /> : undefined}
        {participant.trackStates.speakerMuted ?
          <SpeakerOffIcon className={classesSize.icon} color="secondary" /> :
          (participant.trackStates.micMuted ? <MicOffIcon className={classesSize.icon} color="secondary" /> : undefined)}
        {!participant.trackStates.micMuted && participant.physics.onStage ?
          <Icon className={classesSize.icon} icon={megaphoneIcon} color="gold" /> : undefined }
        {props.isPlayback ? <PlayArrowIcon className={classesSize.iconLeft} htmlColor="#0C0" /> : undefined}
        {participant.recording ? <RecordIcon className={classesSize.iconLeft} htmlColor="#D00" /> : undefined}
      </div>
    </Tooltip>
  }</Observer>
})


const Shadow: React.FC<BasicProps> = React.memo((props) => {
  const participant = props.participant
  const classesSize = useStylesWithSize({size: props.size})
  const outerRadius = calcOuterRadius(props)
  const svgCenter = calcSvgCenter(props)

  return <Observer>{()=>{
    renderLog(`${participant.id} Shadow`)
    const shadowOffset = Math.sqrt(participant.viewpoint.height) / 2.5 - 4
    const shadowScale = 1 + (shadowOffset/200)

    return <svg className={classesSize.pointer} width={props.size * SVG_RATIO} height={props.size * SVG_RATIO}
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
})

export const Participant: React.FC<ParticipantProps> = (props) => {
  const participant = props.participant

  return <Observer>{()=>{
    renderLog(`${participant.id} Participant`)
    const classesPose = useStylesWithPose({
      position: participant.pose.position,
      orientation: participant.pose.orientation,
      size: props.size,
    })
    if (participants.localId === participant.id && !participant.information.avatarSrc){
      props.participant.information.avatarSrc='https://binaural.me/public_packages/uploader/vrm/avatar/256Chinchilla.vrm'
    }
    const depends = [participant.information.name, participant.information.color, participant.information.textColor]


    return <><div className={classesPose.root} style={{zIndex:props.isLocal ? 5000 : props.zIndex}}>
      <Shadow participant={props.participant} size={props.size} />
      <div className={classesPose.pointerRotate}>
        <OuterUnder participant={props.participant} size={props.size} isLocal={props.isLocal} />
        <div className={classesPose.avatar + ' dragHandle'} onContextMenu={props.onContextMenu}>
          <MainAvatar participant={props.participant} isLocal={props.isLocal} isPlayback={props.isPlayback} size={props.size} />
        </div>
        <OuterOver participant={props.participant} size={props.size} isLocal={props.isLocal}/>
        </div>
    </div>
  </>
  }}</Observer>
}
Participant.displayName = 'Participant'
