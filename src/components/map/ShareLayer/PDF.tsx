import { MemoedAvatar } from '@components/avatar/ConnectedAvatar'
import {makeStyles} from '@material-ui/core/styles'
import {t} from '@models/locales'
import {assert} from '@models/utils'
import {getBeforeParamsOfUrl, getParamsFromUrl, getStringFromParams} from '@stores/sharedContents/SharedContentCreator'
import _ from 'lodash'
import {getDocument} from 'pdfjs-dist'
import { PDFDocumentProxy } from 'pdfjs-dist/types/display/api'
import React, {useEffect, useRef} from 'react'
import {ContentProps} from './Content'

const useStyles = makeStyles({
})

class Member{
  props: ContentProps
  params: Map<string, string>
  mainUrl: string
  document?: PDFDocumentProxy
  constructor(props: ContentProps){
    this.props = props
    this.params = getParamsFromUrl(props.content.url)
    this.mainUrl = getBeforeParamsOfUrl(props.content.url)
    this.document = undefined
    getDocument(this.mainUrl).promise.then((doc) => {
      this.document = doc
    }).catch(reason => {
      console.error(`PDF: failed to load ${this.mainUrl}`)
    })
  }
}

function updateUrl(member: Member) {
  const url = member.mainUrl + getStringFromParams(member.params)

  if (url !== member.props.content.url && member.props.updateAndSend) {
    member.props.content.url = url
    member.props.updateAndSend(member.props.content)
  }
}

export const PDF: React.FC<ContentProps> = (props:ContentProps) => {
  assert(props.content.type === 'pdf')
  const memberRef = useRef<Member>(new Member(props))
  const member = memberRef.current

  return <div>
    <img src=
  </div>

}
