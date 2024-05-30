import {sharedContentHandler} from '@components/map/Share/SharedContent'
import {SharedContentForm} from '@components/map/Share/SharedContentForm'
import {Tooltip} from '@material-ui/core'
import Button from '@material-ui/core/Button'
import {Icon} from '@iconify/react'
import doneIcon from '@iconify/icons-material-symbols/check-circle-rounded'
import {isContentOutOfRange, ISharedContent, SharedContentInfo} from '@models/ISharedContent'
import {useTranslation} from '@models/locales'
import {getRandomColor, mulV2, rgb2Color} from '@models/utils'
import {isDarkColor} from '@models/utils'
import {autorun} from 'mobx'
import {Observer} from 'mobx-react-lite'
import {useObserver} from 'mobx-react-lite'
import React from 'react'
import {contentTypeIcons} from '../map/Share/Content'
import {styleForList} from '../utils/styles'
import {TextLineStyle} from './LeftBar'
import {contents, map, roomInfo} from '@stores/'


function locatedContentOnly(content: ISharedContent|undefined){
  if (isContentOutOfRange(content)){ return undefined }

  return content
}

export const ContentLine: React.FC<TextLineStyle & {content: SharedContentInfo}>=(props) => {
  const classes = styleForList({height:props.lineHeight, fontSize:props.fontSize})
  const [showForm, setShowForm] = React.useState(false)
  const ref = React.useRef<HTMLButtonElement>(null)
  const {lineHeight, content, ...contentProps} = props
  let targetContent: ISharedContent|undefined = undefined

  return <Observer>{()=> {
    const typeIcon = contentTypeIcons(props.content.type, props.fontSize)
    const colors = getRandomColor(props.content.ownerName)

    if (props.content.color?.length){ colors[0] = rgb2Color(props.content.color) }
    if (props.content.textColor?.length){ colors[1] = rgb2Color(props.content.textColor) }
    if (showForm){
      targetContent = locatedContentOnly(contents.find(props.content.id))
    }

    return <>
      <Tooltip title={<>{props.content.name}<br />{props.content.ownerName}</>} placement="right">
        <Button ref={ref} variant="contained" className={classes.line}
          style={{backgroundColor:colors[0], color:colors[1], margin: '1px 0 1px 0', padding:0, textTransform:'none'}}
          onClick={() => {
            const found = contents.find(props.content.id)
            if (found){
              map.focusOn(found, mulV2(0.5, found.size))
            }else{
              contents.requestContent([props.content.id])
              const disposer = autorun(()=>{
                const found = contents.find(props.content.id)
                if (found){
                  map.focusOn(found, mulV2(0.5, found.size))
                  disposer()
                }
              })
            }
          }}
          onContextMenu={() => {
            const found = locatedContentOnly(contents.find(props.content.id))
            if (found){
              setShowForm(true)
              map.keyInputUsers.add('contentForm')
            }else{
              contents.requestContent([props.content.id])
              const disposer = autorun(()=>{
                const found = locatedContentOnly(contents.find(props.content.id))
                if (found){
                  setShowForm(true)
                  map.keyInputUsers.add('contentForm')
                  disposer()
                }
              })
            }
          }}
        >{typeIcon}<span className={classes.line}>{props.content.name}</span>
        </Button>
      </Tooltip>
      <SharedContentForm {...contentProps} content={targetContent}
        {...sharedContentHandler(props)} open={showForm}
        close={()=>{
          setShowForm(false)
           map.keyInputUsers.delete('contentForm')
        }}
        anchorEl={ref.current} anchorOrigin={{vertical:'top', horizontal:'right'}}
      />
    </>
  }}</Observer>
}

export const ContentList: React.FC<TextLineStyle>  = (props) => {
  //  console.log('Render RawContentList')
  const all = useObserver(() => {
    const all:SharedContentInfo[] =
      Array.from(contents.roomContentsInfo.size ? contents.roomContentsInfo.values() : contents.all)
    all.sort((a,b) => {
      let rv = a.name.localeCompare(b.name)
      if (rv === 0 && a.ownerName){ rv = a.ownerName.localeCompare(b.ownerName) }
      if (rv === 0 && a.type){ rv = a.type.localeCompare(b.type) }
      if (rv === 0 && a.id){ rv = a.id.localeCompare(b.id) }

      return rv
    })

    return all
  })
  const editing = useObserver(() => contents.editing)
  const classes = styleForList({height:props.lineHeight, fontSize:props.fontSize})
  const elements = all.map(c =>
    <ContentLine key={c.id} content = {c} {...props} />)
  const {t} = useTranslation()
  const textColor = useObserver(() => isDarkColor(roomInfo.backgroundFill) ? 'white' : 'black')

  return <div className={classes.container} >
    <div className={classes.title} style={{color:textColor, height:props.lineHeight}}>{t('Contents')}
      {editing ? <Button variant="contained" size="small" color="primary"
        style={{marginLeft:4, padding:2, height:props.lineHeight}}
        onClick={()=>{ contents.setEditing('')}}>
          <Icon icon={doneIcon} className={classes.line} style={{width:props.fontSize*1.2}}/>
          <span className={classes.line} style={{paddingTop:props.fontSize*0.1}}>{t('shareEditEnd')}</span></Button>: undefined}
    </div>
    {elements}
  </div>
}
ContentList.displayName = 'ContentList'
