import {useStore} from '@hooks/SharedContentsStore'
import {SharedContent as ISharedContent} from '@models/SharedContent'
import {contentLog} from '@stores/sharedContents/SharedContents'
import React from 'react'
import {RndContent} from './RndContent'
export interface SharedContentProps{
  content: ISharedContent,
  editing?: boolean
}

export const SharedContent: React.FC<SharedContentProps> = (props:SharedContentProps) => {
  const store = useStore()

  return (
    <RndContent content={props.content} autoHideTitle={true} editing={props.editing ? true : false}
      onClose={
        (evt: React.MouseEvent<HTMLDivElement>) => {
          contentLog('RndContent onClose for ', props.content.id)
          evt.stopPropagation()
          const pid = store.owner.get(props.content.id)
          if (pid) {
            store.removeByLocal(props.content.id)
          }
        }
      }
      onUpdate={
        (newContent: ISharedContent) => {
          store.updateByLocal(newContent)
        }
      }
    />
  )
}
