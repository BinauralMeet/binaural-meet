import {sharedContentHandler} from '@components/map/ShareLayer/SharedContent'
import {SharedContentForm} from '@components/map/ShareLayer/SharedContentForm'
import {Tooltip} from '@material-ui/core'
import Button from '@material-ui/core/Button'
import DoneIcon from '@material-ui/icons/CheckCircle'
import {SharedContentInfo} from '@models/ISharedContent'
import {useTranslation} from '@models/locales'
import {getRandomColor, rgb2Color} from '@models/utils'
import {isDarkColor} from '@models/utils'
import {ParticipantBase} from '@stores/participants/ParticipantBase'
import roomInfo from '@stores/RoomInfo'
import contents from '@stores/sharedContents/SharedContents'
import { autorun } from 'mobx'
import {Observer} from 'mobx-react-lite'
import {useObserver} from 'mobx-react-lite'
import React from 'react'
import {contentTypeIcons} from '../map/ShareLayer/Content'
import {Stores} from '../utils'
import {styleForList} from '../utils/styles'
import {TextLineStyle} from './LeftBar'

export const ContentLine: React.FC<TextLineStyle & Stores &
{participant: ParticipantBase, content: SharedContentInfo}> = (props) => {
  const classes = styleForList({height:props.lineHeight, fontSize:props.fontSize})
  const [showForm, setShowForm] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)
  const {lineHeight, content, ...contentProps} = props

  return <Observer>{()=> {
    const typeIcon = contentTypeIcons(props.content.type, props.fontSize)
    const colors = getRandomColor(props.content.ownerName)
    const content = props.contents.find(props.content.id)
    if (props.content.color?.length){ colors[0] = rgb2Color(props.content.color) }
    if (props.content.textColor?.length){ colors[1] = rgb2Color(props.content.textColor) }

    return <>
      <Tooltip title={props.content.ownerName} placement="right">
        <div className={classes.line} style={{backgroundColor:colors[0], color:colors[1]}} ref={ref}
          onClick={() => {
            const found = contents.find(props.content.id)
            if (found){
              props.map.focusOn(found)
            }else{
              contents.requestContent([props.content.id])
              const disposer = autorun(()=>{
                const found = contents.find(props.content.id)
                if (found){
                  props.map.focusOn(found)
                  disposer()
                }
              })
            }
          }}
          onContextMenu={() => {
            const found = contents.find(props.content.id)
            if (found){
              setShowForm(true)
              props.map.keyInputUsers.add('contentForm')
            }else{
              contents.requestContent([props.content.id])
              const disposer = autorun(()=>{
                const found = contents.find(props.content.id)
                if (found){
                  setShowForm(true)
                  props.map.keyInputUsers.add('contentForm')
                  disposer()
                }
              })
            }
          }}
        >
          {typeIcon}{props.content.name}
        </div>
      </Tooltip>
      <SharedContentForm {...contentProps} contents={props.contents} content={content}
        {...sharedContentHandler(props)} open={showForm}
        close={()=>{
          setShowForm(false)
          props.map.keyInputUsers.delete('contentForm')
        }}
        anchorEl={ref.current} anchorOrigin={{vertical:'top', horizontal:'right'}}
      />
    </>
  }}</Observer>
}

export const ContentList: React.FC<Stores&TextLineStyle>  = (props) => {
  //  console.log('Render RawContentList')
  const contents = props.contents
  const all = useObserver(() => {
    const all:SharedContentInfo[] =
      Array.from(contents.roomContentsInfo.size ? contents.roomContentsInfo.values() : contents.all)
    all.sort((a,b) => {
      let rv = a.name.localeCompare(b.name)
      if (rv === 0){ rv = a.ownerName.localeCompare(b.ownerName) }
      if (rv === 0){ rv = a.type.localeCompare(b.type) }
      if (rv === 0){ rv = a.id.localeCompare(b.id) }

      return rv
    })

    return all
  })
  const editing = useObserver(() => contents.editing)
  const classes = styleForList({height:props.lineHeight, fontSize:props.fontSize})
  const participants = props.participants
  const elements = all.map(c =>
    <ContentLine key={c.id} content = {c} {...props}
      participant={participants.find(contents.owner.get(c.id) as string) as ParticipantBase} />)
  const {t} = useTranslation()
  const textColor = useObserver(() => isDarkColor(roomInfo.backgroundFill) ? 'white' : 'black')

  return <div className={classes.container} >
    <div className={classes.title} style={{color:textColor}}>{t('Contents')}
      {editing ? <Button variant="contained" size="small" color="primary"
        style={{marginLeft:4, padding:3, height:'1.4em', fontSize:'0.8'}}
        onClick={()=>{ contents.setEditing('')}}>
          <DoneIcon style={{fontSize:'1em'}}/>&nbsp;{t('shareEditEnd')}</Button>: undefined}
    </div>
    {elements}
  </div>
}
ContentList.displayName = 'ContentList'
