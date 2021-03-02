import {Tooltip} from '@material-ui/core'
import {useTranslation} from '@models/locales'
import {SharedContent as ISharedContent} from '@models/SharedContent'
import {MapData} from '@stores/Map'
import {ParticipantBase} from '@stores/participants/ParticipantBase'
import {getRandomColor} from '@stores/utils'
import _ from 'lodash'
import {useObserver} from 'mobx-react-lite'
import React from 'react'
import {contentTypeIcons} from '../map/ShareLayer/Content'
import {Stores} from '../utils'
import {styleForList} from '../utils/styles'

const height = 20
const fontSize = 16

export const ContentLine: React.FC<{participant: ParticipantBase, content: ISharedContent, map: MapData}> = (props) => {
  const contentName = useObserver(() => props.content.name)
  const name = useObserver(() => props.content.ownerName)
  const colors = getRandomColor(name)
  const contentType = useObserver(() => props.content.type)
  const classes = styleForList({height, fontSize})
  const typeIcon = contentTypeIcons(contentType, fontSize)

  return <Tooltip title={name} placement="right">
    <div className={classes.line} style={{backgroundColor:colors[0], color:colors[1]}}
      onClick={() => props.map.focusOn(props.content)}>
        {typeIcon}{contentName}
    </div>
  </Tooltip>
}

export const RawContentList: React.FC<Stores&{all: ISharedContent[]}> = (props: Stores&{all: ISharedContent[]}) => {
  //  console.log('Render RawContentList')
  const contents = props.contents
  const all:ISharedContent[] = []
  Object.assign(all, props.all)
  all.reverse() // Already sorted in the reverse order. all.sort((a, b) => { return b.zorder - a.zorder } )

  const classes = styleForList({height, fontSize})

  const participants = props.participants
  const map = props.map
  const elements = all.map(c =>
    <ContentLine key={c.id} content = {c} map={map}
      participant={participants.find(contents.owner.get(c.id) as string) as ParticipantBase} />)
  const {t} = useTranslation()

  return <div className={classes.container} >
    <div className={classes.title}>{t('Contents')}</div>
    {elements}
  </div>
}
RawContentList.displayName = 'RawContentList'

export const ContentList = React.memo<Stores>(
  (props) => {
    const all = useObserver(() => props.contents.all)

    return <RawContentList {...props} all = {all} />
  },
  (prev, next) => {
    return _.isEqual(prev.contents.all.map(c => c.id), next.contents.all.map(c => c.id))
  },
)
