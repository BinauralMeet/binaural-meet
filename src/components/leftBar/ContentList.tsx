import {sharedContentHandler} from '@components/map/ShareLayer/SharedContent'
import {SharedContentForm} from '@components/map/ShareLayer/SharedContentForm'
import {Tooltip} from '@material-ui/core'
import {useTranslation} from '@models/locales'
import {SharedContent as ISharedContent} from '@models/SharedContent'
import {getRandomColor, rgb2Color} from '@models/utils'
import {ParticipantBase} from '@stores/participants/ParticipantBase'
import _ from 'lodash'
import {Observer} from 'mobx-react-lite'
import React from 'react'
import {contentTypeIcons} from '../map/ShareLayer/Content'
import {Stores} from '../utils'
import {styleForList} from '../utils/styles'
import {TextLineStyle} from './LeftBar'

export const ContentLine: React.FC<TextLineStyle & Stores &
{participant: ParticipantBase, content: ISharedContent}> = (props) => {
  const classes = styleForList({height:props.lineHeight, fontSize:props.fontSize})
  const [showForm, setShowForm] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)
  const {lineHeight, ...contentProps} = props

  return <Observer>{()=> {
    const typeIcon = contentTypeIcons(props.content.type, props.fontSize)
    const colors = getRandomColor(props.content.ownerName)
    if (props.content.color?.length){ colors[0] = rgb2Color(props.content.color) }
    if (props.content.textColor?.length){ colors[1] = rgb2Color(props.content.textColor) }

    return <>
      <Tooltip title={props.content.ownerName} placement="right">
        <div className={classes.line} style={{backgroundColor:colors[0], color:colors[1]}} ref={ref}
          onClick={() => props.map.focusOn(props.content)}
          onContextMenu={() => {
            setShowForm(true)
            props.map.keyInputUsers.add('contentForm')
          }}
        >
          {typeIcon}{props.content.name}
        </div>
      </Tooltip>
      <SharedContentForm {...contentProps} {...sharedContentHandler(props)} open={showForm}
        close={()=>{
          setShowForm(false)
          props.map.keyInputUsers.delete('contentForm')
        }}
        anchorEl={ref.current} anchorOrigin={{vertical:'top', horizontal:'right'}}
      />
    </>
  }}</Observer>
}

export const RawContentList: React.FC<Stores&TextLineStyle&{all: ISharedContent[]}>  = (props) => {
  //  console.log('Render RawContentList')
  const contents = props.contents
  const all:ISharedContent[] = []
  Object.assign(all, props.all)
  all.reverse() // Already sorted in the reverse order. all.sort((a, b) => { return b.zorder - a.zorder } )

  const classes = styleForList({height:props.lineHeight, fontSize:props.fontSize})

  const participants = props.participants
  const elements = all.map(c =>
    <ContentLine key={c.id} content = {c} {...props}
      participant={participants.find(contents.owner.get(c.id) as string) as ParticipantBase} />)
  const {t} = useTranslation()

  return <div className={classes.container} >
    <div className={classes.title}>{t('Contents')}</div>
    {elements}
  </div>
}
RawContentList.displayName = 'RawContentList'

export const ContentList = React.memo<Stores&TextLineStyle>(
  (props) => {
    return <Observer>{ () => {
      return <RawContentList {...props} all = {props.contents.sorted} />
    }
    }</Observer>
  },
  (prev, next) => {
    return _.isEqual(prev.contents.sorted.map(c => c.id), next.contents.sorted.map(c => c.id))
      && prev.fontSize === next.fontSize && prev.lineHeight === next.lineHeight
  },
)
