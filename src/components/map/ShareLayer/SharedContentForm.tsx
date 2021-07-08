import imageLine from '@iconify-icons/clarity/image-line'
import imageOutlineBadged from '@iconify-icons/clarity/image-outline-badged'
import clipboardCopy from '@iconify-icons/heroicons-outline/clipboard-copy'
import pinIcon from '@iconify/icons-mdi/pin'
import pinOffIcon from '@iconify/icons-mdi/pin-off'
import {Icon} from '@iconify/react'
import Box from '@material-ui/core/Box'
import Button from '@material-ui/core/Button'
import DialogContent from '@material-ui/core/DialogContent'
import Popover, { PopoverProps } from '@material-ui/core/Popover'
import Switch from '@material-ui/core/Switch'
import Table from '@material-ui/core/Table'
import TableBody from '@material-ui/core/TableBody'
import TableCell from '@material-ui/core/TableCell'
import TableRow from '@material-ui/core/TableRow'
import TextField from '@material-ui/core/TextField'
import CloseRoundedIcon from '@material-ui/icons/CloseRounded'
import DoneIcon from '@material-ui/icons/Done'
import EditIcon from '@material-ui/icons/Edit'
import FlipToBackIcon from '@material-ui/icons/FlipToBack'
import FlipToFrontIcon from '@material-ui/icons/FlipToFront'
import {t} from '@models/locales'
import { Pose2DMap } from '@models/MapObject'
import {SharedContent as ISharedContent} from '@models/SharedContent'
import {canContentBeAWallpaper, copyContentToClipboard, isContentEditable, isContentWallpaper, makeContentWallpaper,
   moveContentToBottom, moveContentToTop} from '@stores/sharedContents/SharedContentCreator'
import {Observer} from 'mobx-react-lite'
import React, {Fragment} from 'react'
import {contentTypeIcons, editButtonTip} from './Content'
import {RndContentProps, TITLE_HEIGHT} from './RndContent'

type PopoverPropsNoOnClose = Omit<PopoverProps, 'onClose'>
export interface SharedContentFormProps extends RndContentProps, PopoverPropsNoOnClose{
  close: () => void,
  content: ISharedContent
  open: boolean
}

type ContentType = JSX.Element | string

function Row(left1: ContentType, left2: ContentType, center: ContentType,
  right2: ContentType, right1: ContentType, key?: string|number){
  const cellstyle = {
    margin:0,
    padding:2,
    border:'none',
  }

  return <TableRow key={key}>
    <TableCell align="right" style={cellstyle}>{left1}</TableCell>
    <TableCell align="right" style={cellstyle}>{left2}</TableCell>
    <TableCell style={cellstyle}>{center}</TableCell>
    <TableCell style={cellstyle}>{right2}</TableCell>
    <TableCell style={cellstyle}>{right1}</TableCell>
  </TableRow>
}

class SharedContentFormMember{
  zorder!: number
  pinned!: boolean
  editing!: string
  name!: string
  pose!: Pose2DMap
  constructor(props: SharedContentFormProps){
    this.save(props)
  }
  save(props: SharedContentFormProps){
    this.zorder = props.content.zorder
    this.pinned = props.content.pinned
    this.name = props.content.name
    this.pose = props.content.pose
    this.editing = props.contents.editing
  }
  restore(props: SharedContentFormProps){
    props.content.zorder = this.zorder
    props.content.pinned = this.pinned
    props.content.name = this.name
    props.content.pose = this.pose
    props.contents.setEditing(this.editing)
  }
}
export const SharedContentForm: React.FC<SharedContentFormProps> = (props: SharedContentFormProps) => {
  const memberRef = React.useRef(new SharedContentFormMember(props))
  const member = memberRef.current
  function closeForm(ev:Object, reason:string) {
    if (reason === 'enter' || reason==='backdropClick'){
      member.save(props)
      props.updateAndSend(props.content)
    }
    props.close()
  }
  const onKeyPress = (ev:React.KeyboardEvent) => {
    if (ev.key === 'Enter') {
      closeForm(ev, 'enter')
    }
  }

  const extractPopoverProps = ({onClose, autoHideTitle, updateAndSend, updateOnly, close, ...reminder}
    : SharedContentFormProps) => reminder
    const popoverProps:PopoverPropsNoOnClose = extractPopoverProps(props)

  return <Popover onClose={closeForm} {...popoverProps} onMouseDown={(ev)=>{
    ev.stopPropagation()
  }}>
    <Observer>{()=>
      <DialogContent>
        <table><tbody><tr><td>
       {contentTypeIcons(props.content.type, TITLE_HEIGHT)}
       </td><td>
        <TextField label={t('ctName')} multiline={false} value={props.content.name} inputProps={{autoFocus:true}}
          style={{marginLeft:20, width:'100%'}}
          onChange={event => {
            //setName(event.target.value)
            props.content.name = event.target.value
            props.updateOnly(props.content)
          }}
          onKeyPress={onKeyPress} fullWidth={true}
        />
        </td></tr></tbody></table>
        <Box mt={2} mb={2}>
          <Button variant="contained" style={{textTransform:'none'}}
            onClick={()=>{
              moveContentToTop(props.content)
              props.updateOnly(props.content)
            }}><FlipToFrontIcon />&nbsp; {t('ctMoveTop')}</Button> &nbsp;
          <Button variant="contained" style={{textTransform:'none'}}
            onClick={()=>{
              moveContentToBottom(props.content)
              props.updateOnly(props.content)
            }}><FlipToBackIcon />&nbsp; {t('ctMoveBottom')}</Button> &nbsp;
        </Box>
        <Box mt={2} mb={2}>
          <Button variant="contained" style={{textTransform:'none'}}
            onClick={()=>{
              copyContentToClipboard(props.content)
            }}><Icon icon={clipboardCopy} height={TITLE_HEIGHT}/>&nbsp; {t('ctCopyToClipboard')}</Button> &nbsp;
          <Button variant="contained" style={{textTransform:'none'}}
            onClick={()=>{
              props.map.focusOn(props.content)
            }}>{t('ctFocus')}</Button>
        </Box>
        <Table size="small" ><TableBody>{[
          Row(t('ctUnpin'),<Icon icon={pinOffIcon} height={TITLE_HEIGHT} />,
            <Switch color="primary" checked={props.content.pinned} onChange={(ev, checked)=>{
              props.content.pinned = checked
              props.updateOnly(props.content)
            }}/>, <Icon icon={pinIcon} height={TITLE_HEIGHT} />, t('ctPin'), 'pin'),
          <Fragment key="edit">{isContentEditable(props.content) ?
            Row(editButtonTip(true, props.content),<DoneIcon />,
            <Switch color="primary" checked={props.content.id === props.contents.editing} onChange={(ev, checked)=>{
              props.contents.setEditing(checked ? props.content.id : '')
            }}/>, <EditIcon />, editButtonTip(false, props.content)) : undefined}</Fragment>,
          <Fragment key="wall">{canContentBeAWallpaper(props.content) ?
            Row(t('ctUnWallpaper'), <Icon icon={imageLine} height={TITLE_HEIGHT}/>,
            <Switch color="primary" checked={isContentWallpaper(props.content)} onChange={(ev, checked)=>{
              makeContentWallpaper(props.content, checked)
              props.updateOnly(props.content)
            }}/>, <Icon icon={imageOutlineBadged} height={TITLE_HEIGHT}/>, t('ctWallpaper')) : undefined}</Fragment>,
        ]}</TableBody></Table>
        <Box mt={2} mb={2}>
          <Button variant="contained" color="primary" style={{textTransform:'none'}}
            onClick={()=>{
              closeForm({}, 'enter')
            }}>{t('btSave')}</Button>
          <Button variant="contained" color="secondary" style={{textTransform:'none', marginLeft:15}}
            onClick={()=>{
              member.restore(props)
              props.updateOnly(props.content)
            }}>{t('btCancel')}</Button>
          <Button variant="contained" color="secondary" style={{textTransform:'none', marginLeft:60}}
            onClick={(ev)=>{
              props.onClose(ev)
            }}><CloseRoundedIcon /> &nbsp; {t('ctDelete')}</Button> &nbsp;&nbsp;
        </Box>
      </DialogContent>}
    </Observer>
  </Popover>
}
