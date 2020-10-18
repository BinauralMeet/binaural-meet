import {useStore} from '@hooks/SharedContentsStore'
import {SharedContent as ISharedContent} from '@models/SharedContent'
import React from 'react'
import {RndContent} from './RndContent'

export interface SharedContentProps{
  content: ISharedContent,
}

export const SharedContent: React.FC<SharedContentProps> = (props:SharedContentProps) => {
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
      onUpdate={
        (newContent: ISharedContent) => {
          /*const old = props.content
          let identical = false
          if (old.zorder === newContent.zorder) {
            old.zorder += 1
            if (old.zorder === newContent.zorder) {
              identical = true
            }
          }*/
          //  console.log('RndContent onUpdate from ', old, ' to ', newContent, ` ==? ${identical} `)
          store.updateContents([newContent])
        }
      }
    />
  )
}
