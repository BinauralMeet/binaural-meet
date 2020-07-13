import {makeStyles} from '@material-ui/core/styles'
import {SharedContent as ISharedContent} from '@models/sharedContent/SharedContent'
import {SharedContent as SharedContentStore} from '@stores/sharedContents/SharedContent'
import {SharedContents as SharedContentsStore} from '@stores/sharedContents/SharedContents'
import {useObserver} from 'mobx-react-lite'
import React, {useEffect, useState} from 'react'
import {RndContent} from './RndContent'

export interface SharedContentProps{
  mapKey: string,
  content: SharedContentStore,
  contents: SharedContentsStore
}

export const SharedContent: React.FC<SharedContentProps> = (props:SharedContentProps) => {
  console.log('SharedContent', props)

  return (
    <RndContent content={props.content} autoHideTitle={true}
      onClose={
        (evt: React.MouseEvent<HTMLDivElement>) => {
          evt.stopPropagation()
          props.contents.order.delete(props.mapKey)
        }
      }
      onUpdate={
        (newContent: ISharedContent) => {
          props.contents.order.set(props.mapKey, newContent)
        }
      }
    />
  )
}
