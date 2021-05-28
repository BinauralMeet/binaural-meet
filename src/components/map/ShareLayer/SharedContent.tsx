import {Stores} from '@components/utils'
import {SharedContent as ISharedContent} from '@models/SharedContent'
import {doseContentEditingUseKeyinput} from '@stores/sharedContents/SharedContentCreator'
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
  if (doseContentEditingUseKeyinput(props.content)){
    if (editing) {
      map.keyInputUsers.add(props.content.id)
    }else {
      map.keyInputUsers.delete(props.content.id)
    } }

  return (
    <RndContent {...props} autoHideTitle={true}
      onClose={
        (evt: MouseOrTouch) => {
          contentLog('RndContent onClose for ', props.content.id)
          evt.stopPropagation()
          map.keyInputUsers.delete(props.content.id)
          const pid = store.owner.get(props.content.id)
          if (pid) {
            store.removeByLocal(props.content.id)
          }
        }
      }
      updateAndSend={
        (c: ISharedContent) => {
          store.updateByLocal(Object.assign({}, c))
        }
      }
      updateOnly={
        (c: ISharedContent) => {
          store.updateLocalOnly(Object.assign({}, c))
        }
      }
    />
  )
}

SharedContent.displayName = 'SharedContent'

