import {Stores} from '@components/utils'
import {ISharedContent} from '@models/ISharedContent'
import {SharedContentInfo} from '@models/ISharedContent'
import {contentLog} from '@stores/sharedContents/SharedContents'
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
  return <RndContent {...props} autoHideTitle={true} {... sharedContentHandler(props)} />
}

SharedContent.displayName = 'SharedContent'
