import {StoreProvider as ContentsProvider, useStore} from '@hooks/SharedContentsStore'
import {makeStyles} from '@material-ui/core/styles'
import {SharedContent as ISharedContent} from '@models/sharedContent/SharedContent'
import {SharedContent as SharedContentStore} from '@stores/sharedContents/SharedContent'
import {SharedContents as SharedContentsStore} from '@stores/sharedContents/SharedContents'
import {useObserver} from 'mobx-react-lite'
import React, {useEffect, useState} from 'react'
import {RndContent} from './RndContent'

export interface SharedContentProps{
  content: SharedContentStore,
}

export const SharedContent: React.FC<SharedContentProps> = (props:SharedContentProps) => {
  const {
    content,
  } = props

  const store = useStore()

  return (
    <RndContent content={props.content} autoHideTitle={true}
      onClose={
        (evt: React.MouseEvent<HTMLDivElement>) => {
          console.log('RndContent onClose for ', props.content.id)
          evt.stopPropagation()
          const pid = store.owner.get(props.content.id)
          if (pid) {
            store.removeContents(pid, [props.content.id])
          }
        }
      }
      afterUpdate={
        () => {
          content.zorder += 1
          store.updateContents([newContent])
        }
      }
    />
  )
}
