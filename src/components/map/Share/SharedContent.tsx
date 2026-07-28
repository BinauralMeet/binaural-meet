import {ISharedContent} from '@models/ISharedContent'
import {SharedContentInfo} from '@models/ISharedContent'
import {contentLog} from '@models/utils'
import React from 'react'
import {MouseOrTouch, RndContent} from './RndContent'
export interface ISharedContentProps{
  content: ISharedContent,
}
import {contentSyncService, map} from '@stores/'

export const sharedContentHandler = (props: {content:SharedContentInfo}) => {
  return {
    onClose: (evt: MouseOrTouch) => {
      if (props.content.playback) return //  for playback contents do nothing

      contentLog()('RndContent onClose for ', props.content.id)
      evt.stopPropagation()
      map.keyInputUsers.delete(props.content.id)
      map.keyInputUsers.delete('contentForm')
      contentSyncService.removeByLocal(props.content.id)
    },
    updateAndSend:(c: ISharedContent) => {
      if (c.playback) return //  for playback contents do nothing
      //	console.log('updateByLocal(send content)')
      contentSyncService.updateByLocal(Object.assign({}, c))
    },
    updateOnly:(c: ISharedContent) => {
      if (c.playback) return //  for playback contents do nothing
      contentSyncService.updateLocalOnly(Object.assign({}, c))
    }
  }
}

export const SharedContent: React.FC<ISharedContentProps> = (props:ISharedContentProps) => {
  return <RndContent {...props} autoHideTitle={true} {... sharedContentHandler(props)} />
}

SharedContent.displayName = 'SharedContent'
