import {makeStyles} from '@material-ui/core/styles'
import {SharedContent as ISharedContent} from '@models/SharedContent'
import {SharedContent as SharedContentStore} from '@stores/SharedContent'
import {SharedContents as SharedContentsStore} from '@stores/SharedContents'
import {useObserver} from 'mobx-react-lite'
import React, {useEffect, useState} from 'react'
import {RndContent} from './RndContent'

export interface SharedContentProps{
  key: string,
  content: SharedContentStore,
  contents: SharedContentsStore
}
interface StyleProp {
  props: SharedContentProps,
  barVisible: boolean
}

export const SharedContent: React.FC<SharedContentProps> = (props:SharedContentProps) => {
  useObserver(() => props.content)

  return (
    <RndContent content={props.content} autoHideTitle={true}
      onClose={
        (evt: React.MouseEvent<HTMLDivElement>) => {
          evt.stopPropagation()
          props.contents.order.delete(props.key)
        }
      }
      onUpdate={
        (newContent: ISharedContent) => {
          props.contents.order.set(props.key, newContent)
        }
      }
    />
  )
}
