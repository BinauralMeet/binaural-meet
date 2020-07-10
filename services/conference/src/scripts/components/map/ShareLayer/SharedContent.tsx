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
          const old:ISharedContent = props.content
          let identical = false
          if (old.zorder === newContent.zorder) {
            old.zorder += 1
            if (old.zorder === newContent.zorder) {
              identical = true
            }
          }
          console.log('RndContent onUpdate from ', old, ' to ', newContent, ` ==? ${identical} `)
          store.updateContents([newContent])
        }
      }
    />
  )
}
