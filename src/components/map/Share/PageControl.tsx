import { pointerStoppers } from '@components/utils'
import {Collapse, Grid, TextField} from '@material-ui/core'
import { useState } from 'react'
import IconButton from '@material-ui/core/IconButton'
import NavigateBeforeIcon from '@material-ui/icons/NavigateBefore'
import NavigateNextIcon from '@material-ui/icons/NavigateNext'
import {PassiveListener} from 'react-event-injector'

interface PageControlProps{
  numPages: number | undefined
  page: number
  onSetPage: (p:number)=>void
}
export const PageControl: React.FC<PageControlProps> = (props:PageControlProps) => {
  const stopper = pointerStoppers
  const [showPage, setShowPage] = useState(true)
  const [page, setPage] = useState(props.page<1 ? 1 : (props.numPages!==undefined && props.page>props.numPages ? props.numPages : props.page ))
  const [pageText, setPageText] = useState(page.toString())
  function checkAndUpdatePage(p: number){
    if (p < 1) p = 1
    if (props.numPages!==undefined && p > props.numPages) p = props.numPages
    if (p !== page){
      setPage(p)
      setPageText((p).toString())
    }
    return p
  }
  function checkAndSetPage(p: number){
    const prev = page
    p = checkAndUpdatePage(p)
    if (p !== prev) props.onSetPage(p)
  }
  if (page !== props.page) checkAndUpdatePage(props.page)

  return  <div style={{position:'absolute', top:0, left:0, width:'100%', height:40}}
  onPointerEnter={()=>{setShowPage(true)}} onPointerLeave={()=>{setShowPage(false)}}>
    <Collapse in={showPage} style={{position:'absolute', top:0, left:0}}>
      <div style={{display:'flex', alignItems:'center', backgroundColor:'white'}}>
        <PassiveListener {...stopper}>
          <IconButton size="small" color={page>1?'primary':'default'}
            onClick={(ev) => {
              checkAndSetPage(page - 1)
            }}
            onDoubleClick={(ev) => {ev.stopPropagation() }} >
            <NavigateBeforeIcon />
          </IconButton>
        </PassiveListener>
        <PassiveListener {...stopper}>
          <TextField value={pageText} style={{width:'2em'}}
            inputProps={{min: 0, style: { textAlign: 'center' }}}
            onChange={(ev)=> { setPageText(ev.target.value)}}
            onBlur={(ev) => {
              const num = Number(pageText)
              checkAndSetPage(num)
            }}
            onKeyDown={(ev)=>{
              if (ev.key === 'Enter'){
                const num = Number(pageText)
                checkAndSetPage(num)
              }
            }}
          />
        </PassiveListener>
        / {props.numPages}
        <PassiveListener {...stopper}>
          <IconButton size="small" color={props.numPages && page < props.numPages?'primary':'default'}
            onClick={(ev) => { ev.stopPropagation();
              checkAndSetPage(page + 1)
            }}
            onDoubleClick={(ev) => {ev.stopPropagation() }} >
          <NavigateNextIcon />
          </IconButton>
        </PassiveListener>
      </div>
    </Collapse>
  </div>
}
