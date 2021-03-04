
import {makeStyles} from '@material-ui/core/styles'

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
    opacity: 0.2,
    zIndex: 1,
    boxSizing: 'border-box',
    backgroundClip: 'padding-box',
    width: 11,
    margin: '0 -10px 0 0',
    borderLeft: '1px solid black',
    borderRight: '10px solid rgba(255, 255, 255, 0)',
    cursor: 'col-resize',
  },
  resizerHorizontal: {
    background: '#000',
    opacity: 0.2,
    zIndex: 1,
    boxSizing: 'border-box',
    backgroundClip: 'padding-box',
    height: 11,
    margin: '-5px 0 -5px 0',
    borderTop: '5px solid rgba(255, 255, 255, 0)',
    borderBottom: '5px solid rgba(255, 255, 255, 0)',
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
    margin: '1px 0 1px 0',
  }),
})
