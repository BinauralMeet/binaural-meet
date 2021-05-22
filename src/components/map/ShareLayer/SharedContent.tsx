import {Stores} from '@components/utils'
import {SharedContent as ISharedContent} from '@models/SharedContent'
import {contentLog} from '@stores/sharedContents/SharedContents'
import {useObserver} from 'mobx-react-lite'
import React from 'react'
import {MouseOrTouch, RndContent} from './RndContent'
export interface SharedContentProps extends Stores{
  content: ISharedContent,
}

export const SharedContent: React.FC<SharedContentProps> = (props:SharedContentProps) => {
  //  set whether use keyboard input or not
  const map = props.map
  const store = props.contents
  const editing = useObserver(() => props.contents.editing === props.content.id)
  if (editing) {
    map.keyInputUsers.add(props.content.id)
  }else {
    map.keyInputUsers.delete(props.content.id)
  }

  return (
    <RndContent {...props} autoHideTitle={true}
      onClose={
        (evt: MouseOrTouch) => {
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

SharedContent.displayName = 'SharedContent'

