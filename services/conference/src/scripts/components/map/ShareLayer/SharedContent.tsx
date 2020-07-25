import {StoreProvider as ContentsProvider, useStore} from '@hooks/SharedContentsStore'
import {SharedContent as ISharedContent} from '@models/SharedContent'
import React, {useEffect, useState} from 'react'
import {RndContent} from './RndContent'

export interface SharedContentProps{
  content: ISharedContent,
}

export const SharedContent: React.FC<SharedContentProps> = (props:SharedContentProps) => {
  const {content} = props

  const store = useStore()

  return (
    <RndContent content={props.content} autoHideTitle={true}
      onClose={
        (evt: React.MouseEvent<HTMLDivElement>) => {
          console.log('RndContent onClose for ', content.id)
          evt.stopPropagation()
          store.change((doc) => {
            const order = store.getRenderOrder(content.id)
            delete doc.renderOrder[order]
          })
        }
      }
      onUpdate={
        () => store.moveFront(content.id)
      }
      contentChanger = {store.contentChanger(content.id)}
    />
  )
}
