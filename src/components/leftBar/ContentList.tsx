import {contentTypeIcons} from '@components/map/shareLayer/Content'
import {Tooltip} from '@material-ui/core'
import {useTranslation} from '@models/locales'
import {SharedContent as ISharedContent} from '@models/SharedContent'
import {getRandomColor, rgb2Color} from '@models/utils'
import {ParticipantBase} from '@stores/participants/ParticipantBase'
import {Room} from '@stores/Room'
import _ from 'lodash'
import {Observer} from 'mobx-react-lite'
import React from 'react'
import {styleForList} from '../utils/styles'
import {TextLineStyle} from './LeftBar'

export const ContentLine: React.FC<TextLineStyle &
{room: Room, participant: ParticipantBase, content: ISharedContent}> = (props) => {
  const classes = styleForList({height:props.lineHeight, fontSize:props.fontSize})

  return <Observer>{()=> {
    const typeIcon = contentTypeIcons(props.content.type, props.fontSize)
    const colors = getRandomColor(props.content.ownerName)
    if (props.content.color?.length){ colors[0] = rgb2Color(props.content.color) }
    if (props.content.textColor?.length){ colors[1] = rgb2Color(props.content.textColor) }

    return <>
      <Tooltip title={props.content.ownerName} placement="right">
        <div className={classes.line} style={{backgroundColor:colors[0], color:colors[1]}}>
          {typeIcon}{props.content.name}
        </div>
      </Tooltip>
    </>
  }}</Observer>
}

export const RawContentList: React.FC<TextLineStyle&{room: Room, all: ISharedContent[]}>  = (props) => {
  //  console.log('Render RawContentList')
  const contents = props.room.contents
  const all:ISharedContent[] = []
  Object.assign(all, props.all)
  all.reverse() // Already sorted in the reverse order. all.sort((a, b) => { return b.zorder - a.zorder } )

  const classes = styleForList({height:props.lineHeight, fontSize:props.fontSize})

  const participants = props.room.participants
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

export const ContentList = React.memo<TextLineStyle&{room:Room}>(
  (props) => {
    return <Observer>{ () => {
      return <RawContentList {...props} all = {props.room.contents.sorted} />
    }
    }</Observer>
  },
  (prev, next) => {
    return _.isEqual(prev.room.contents.sorted.map(c => c.id), next.room.contents.sorted.map(c => c.id))
      && prev.fontSize === next.fontSize && prev.lineHeight === next.lineHeight
  },
)
