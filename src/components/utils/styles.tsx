
import {makeStyles} from '@material-ui/core/styles'
import {isSmartphone} from '@models/utils'
import FormControlLabel from '@material-ui/core/FormControlLabel'
import Radio from '@material-ui/core/Radio'
import radioButtonCheckedIcon from '@iconify/icons-ic/round-radio-button-checked'
import radioButtonUncheckedIcon from '@iconify/icons-ic/round-radio-button-unchecked'
import checkboxCheckedIcon from '@iconify/icons-ic/round-check-box'
import checkboxUncheckedIcon from '@iconify/icons-ic/round-check-box-outline-blank'
import {Icon} from '@iconify/react'
import Checkbox from '@material-ui/core/Checkbox'

//  Named z-index tiers -- same numeric values as before, just given names. This is a rename pass
//  only; stacking order must not change, so verify visually (dialogs/cursor/participants/content
//  overlap) before relying on this after touching any of these sites.
export const Z_INDEX = {
  splitter: 1,
  statusDialog: 2,
  chatOverlay: 1000,
  participantLocal: 5000,
  cursorLocal: 6000,
  cursorRemoteOffset: 4000,
  participantLayerTop: 0x7FFF,
}

export const styleCommon = makeStyles({
  back:{
    position: 'absolute',
    width: '100%',
    height: '100%',
    top: 0,
    left: 0,
    backgroundColor: '#DFDBE5',
  },
  fill:{
    position: 'absolute',
    width: '100%',
    height: '100%',
    top: 0,
    left: 0,
  },
})

export const styleForSplit = makeStyles({
  resizerVertical: {
    background: '#000',
    zIndex: Z_INDEX.splitter,
    boxSizing: 'border-box',
    backgroundClip: 'padding-box',
    width: 11,
    margin: '0 -10px 0 0',
    borderLeft: '1px solid gray',
    borderRight: 'transparent 10px solid',
    cursor: 'col-resize',
  },
  resizerHorizontal: {
    background: 'gray',
    zIndex: Z_INDEX.splitter,
    boxSizing: 'border-box',
    backgroundClip: 'padding-box',
    height: 10.5,
    margin: '-5px 0 -5px 0',
    borderTop: '5px transparent solid',
    borderBottom: '5px transparent solid',
    cursor: 'row-resize',
  },
})

export interface ListLineProps{
  height:number
  fontSize:number
}

export const styleForList = makeStyles({
  container: {
    width:'100%',
  },
  title: (props: ListLineProps) => ({
    fontSize: props.fontSize * 0.8,
    justifyContent: 'start',
    justifyItems: 'start',
    alignItems: 'center',
    userSelect: 'none',
    userDrag: 'none',
    whiteSpace: 'nowrap',
    width: '100%',
  }),
  outer: {
    display: 'flex',
    whiteSpace: 'nowrap',
    padding: 0,
    margin: 0,
    width: '100%',
  },
  line: (props: ListLineProps) => ({
    display: 'flex',
    justifyContent: 'start',
    justifyItems: 'start',
    alignItems: 'center',
    userSelect: 'none',
    userDrag: 'none',
    whiteSpace: 'nowrap',
    fontSize: props.fontSize,
    height: props.height,
    width: '100%',
    padding: 0,
  })
})


const smartphoneScale = 1.5
export const fontScale = isSmartphone() ? smartphoneScale : 1
export const dialogStyle:React.CSSProperties = {fontSize: fontScale*18}
export const titleStyle:React.CSSProperties = {fontSize:fontScale*22}

//  Named em-based icon/font sizes -- these are the values already in use scattered across the
//  codebase, just given names. Do not add new values here without checking for an existing match.
export const FONT_SIZE = {
  icon: '1.2em',
  small: '1.3em',
  medium: '1.4em',
  large: '1.5em',
}

//  Colors reused verbatim (by value, not by intent) in multiple components.
export const COLOR = {
  recording: '#D00',
  active: '#0C0',
}

export const RADIUS = {
  contentCorner: '0.5em',
}

export const tfIStyle:React.CSSProperties = {
  fontSize: FONT_SIZE.large,
  height: FONT_SIZE.large,
}
export const iconStyle = {}//{fontSize:`${1.5*fontScale}rem`}
export const tfLStyle = {}//{ fontSize: `${fontScale}em` }
export const tfDivStyle = {}//{ height: `${fontScale*3}em` }
export const buttonStyle:React.CSSProperties = {textTransform: 'none', fontSize:FONT_SIZE.icon}//{fontSize: `${fontScale}em`}
export const inputStyle = buttonStyle
export const translateIconStyle = {fontSize: fontScale*24}

export interface RadioWithLabelProps {
  value: string
  checked: boolean
  label?: JSX.Element | string
}
export function RadioWithLabel(props:RadioWithLabelProps){
  return <FormControlLabel value={props.value} control={
    <span style={dialogStyle}>
      <Radio style={{fontSize:FONT_SIZE.medium}}
        value={props.value}
        checked={props.checked}
        checkedIcon={<Icon icon={radioButtonCheckedIcon} color="secondary"/>}
        icon={<Icon icon={radioButtonUncheckedIcon} />}
      />
    </span>
  } label={<span style={{...dialogStyle, verticalAlign:'text-top'}}>{props.label?props.label:props.value}</span>} />
}

export interface CheckWithLabelProps {
  checked: boolean
  label?: JSX.Element | string
  onChange?: (ev:React.ChangeEvent<HTMLInputElement>, checked:boolean)=>void
}
export function CheckWithLabel(props:CheckWithLabelProps){
  return <FormControlLabel control={
    <span style={dialogStyle}>
      <Checkbox style={{fontSize:FONT_SIZE.medium}}
        onChange={props.onChange}
        checked={props.checked}
        checkedIcon={<Icon icon={checkboxCheckedIcon} color="secondary"/>}
        icon={<Icon icon={checkboxUncheckedIcon}
        />}
      />
    </span>
  } label={<span style={{...dialogStyle, verticalAlign:'text-top'}}>{props.label}</span>} />
}
