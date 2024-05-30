import {ISharedContent} from '@models/ISharedContent'
import {SharedContentInfo} from '@models/ISharedContent'
import {contentLog} from '@models/utils'
import React from 'react'
import {MouseOrTouch, RndContent} from './RndContent'
export interface ISharedContentProps{
  content: ISharedContent,
}
import {contents, map} from '@stores/'

export const sharedContentHandler = (props: {content:SharedContentInfo}) => {
  return {
    onClose: (evt: MouseOrTouch) => {
      contentLog()('RndContent onClose for ', props.content.id)
      evt.stopPropagation()
      map.keyInputUsers.delete(props.content.id)
      map.keyInputUsers.delete('contentForm')
      contents.removeByLocal(props.content.id)
    },
    updateAndSend:(c: ISharedContent) => {
      //	console.log('updateByLocal(send content)')
      contents.updateByLocal(Object.assign({}, c))
    },
    updateOnly:(c: ISharedContent) => {
      contents.updateLocalOnly(Object.assign({}, c))
    }
  }
}

export const SharedContent: React.FC<ISharedContentProps> = (props:ISharedContentProps) => {
  return <RndContent {...props} autoHideTitle={true} {... sharedContentHandler(props)} />
}

SharedContent.displayName = 'SharedContent'
