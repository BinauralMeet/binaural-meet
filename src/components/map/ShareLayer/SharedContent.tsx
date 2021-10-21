import {BMProps} from '@components/utils'
import {ISharedContent} from '@models/ISharedContent'
import {SharedContentInfo} from '@models/ISharedContent'
import {contentLog} from '@stores/sharedContents/SharedContents'
import React from 'react'
import {MouseOrTouch, RndContent} from './RndContent'
export interface ISharedContentProps extends BMProps{
  content: ISharedContent,
}

export const sharedContentHandler = (props: BMProps&{content:SharedContentInfo}) => {
  return {
    onClose: (evt: MouseOrTouch) => {
      contentLog('RndContent onClose for ', props.content.id)
      evt.stopPropagation()
      props.stores.map.keyInputUsers.delete(props.content.id)
      props.stores.map.keyInputUsers.delete('contentForm')
      props.stores.contents.removeByLocal(props.content.id)
    },
    updateAndSend:(c: ISharedContent) => {
      //	console.log('updateByLocal(send content)')
      props.stores.contents.updateByLocal(Object.assign({}, c))
    },
    updateOnly:(c: ISharedContent) => {
      props.stores.contents.updateLocalOnly(Object.assign({}, c))
    }
  }
}

export const SharedContent: React.FC<ISharedContentProps> = (props:ISharedContentProps) => {
  return <RndContent {...props} autoHideTitle={true} {... sharedContentHandler(props)} />
}

SharedContent.displayName = 'SharedContent'
