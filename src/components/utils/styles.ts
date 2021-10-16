
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
  }),
})
