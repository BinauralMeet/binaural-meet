import {StoreProvider as ContentsProvider, useStore} from '@hooks/SharedContentsStore'
import {makeStyles} from '@material-ui/core/styles'
import {SharedContent as ISharedContent} from '@models/SharedContent'
import {SharedContent as SharedContentStore} from '@stores/sharedContents/SharedContent'
import {SharedContents as SharedContentsStore} from '@stores/sharedContents/SharedContents'
import {useObserver} from 'mobx-react-lite'
import React, {useEffect, useState} from 'react'
import {RndContent} from './RndContent'

export interface SharedContentProps{
  content: SharedContentStore,
}

export const SharedContent: React.FC<SharedContentProps> = (props:SharedContentProps) => {
  const store = useStore()

  return (
    <RndContent content={props.content} autoHideTitle={true}
      onClose={
        (evt: React.MouseEvent<HTMLDivElement>) => {
          evt.stopPropagation()
          store.removeContents([props.content.id])
        }
      }
      onUpdate={
        (newContent: ISharedContent) => {
          console.log('RndContent onUpdate called for', props.content)
          store.updateContents([newContent])
        }
      }
    />
  )
}
