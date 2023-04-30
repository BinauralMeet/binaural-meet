
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
    zIndex: 1,
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
    zIndex: 1,
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

export const tfIStyle:React.CSSProperties = {
  fontSize: `1.5em`,
  height: `1.5em`,
}
export const iconStyle = {}//{fontSize:`${1.5*fontScale}rem`}
export const tfLStyle = {}//{ fontSize: `${fontScale}em` }
export const tfDivStyle = {}//{ height: `${fontScale*3}em` }
export const buttonStyle:React.CSSProperties = {textTransform: 'none', fontSize:'1.2em'}//{fontSize: `${fontScale}em`}
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
      <Radio style={{fontSize:'1.4em'}}
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
      <Checkbox style={{fontSize:'1.4em'}}
        onChange={props.onChange}
        checked={props.checked}
        checkedIcon={<Icon icon={checkboxCheckedIcon} color="secondary"/>}
        icon={<Icon icon={checkboxUncheckedIcon}
        />}
      />
    </span>
  } label={<span style={{...dialogStyle, verticalAlign:'text-top'}}>{props.label}</span>} />
}
