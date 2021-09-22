import {Stores} from '@components/utils'
import {doseContentEditingUseKeyinput, ISharedContent} from '@models/ISharedContent'
import {SharedContentInfo} from '@models/ISharedContent'
import {contentLog} from '@stores/sharedContents/SharedContents'
import {useObserver} from 'mobx-react-lite'
import React from 'react'
import {MouseOrTouch, RndContent} from './RndContent'
export interface ISharedContentProps extends Stores{
  content: ISharedContent,
}

export const sharedContentHandler = (props: Stores&{content:SharedContentInfo}) => {
  return {
    onClose: (evt: MouseOrTouch) => {
      contentLog('RndContent onClose for ', props.content.id)
      evt.stopPropagation()
      props.map.keyInputUsers.delete(props.content.id)
      props.map.keyInputUsers.delete('contentForm')
      props.contents.removeByLocal(props.content.id)
    },
    updateAndSend:(c: ISharedContent) => {
      //	console.log('updateByLocal(send content)')
      props.contents.updateByLocal(Object.assign({}, c))
    },
    updateOnly:(c: ISharedContent) => {
      props.contents.updateLocalOnly(Object.assign({}, c))
    }
  }
}

export const SharedContent: React.FC<ISharedContentProps> = (props:ISharedContentProps) => {
  //  set whether use keyboard input or not
  const map = props.map
  const editing = useObserver(() => props.contents.editing === props.content.id)
  if (doseContentEditingUseKeyinput(props.content)){
    if (editing) {
      map.keyInputUsers.add(props.content.id)
    }else {
      map.keyInputUsers.delete(props.content.id)
    } }

  return <RndContent {...props} autoHideTitle={true} {... sharedContentHandler(props)} />
}

SharedContent.displayName = 'SharedContent'
