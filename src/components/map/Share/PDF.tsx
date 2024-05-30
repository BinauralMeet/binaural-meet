import {getProxiedUrl} from '@models/api/CORS'
import {assert} from '@models/utils'
import {makeObservable, observable} from 'mobx'
import {Observer} from 'mobx-react-lite'
import {getDocument, GlobalWorkerOptions, renderTextLayer} from 'pdfjs-dist'
import {PDFDocumentLoadingTask, PDFDocumentProxy, PDFPageProxy} from 'pdfjs-dist/types/display/api'
import React, {useEffect, useRef} from 'react'
import {ContentProps} from './Content'
import { pointerStoppers } from '@components/utils'
import { PageControl } from './PageControl'
import {contents} from '@stores/'

////GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@2.7.570/es5/build/pdf.worker.js'
GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@2.7.570/build/pdf.worker.js'
const CANVAS_SCALE = 3

export declare class RenderTask {
  constructor(internalRenderTask: any);
  _internalRenderTask: any
  /**
   * Callback for incremental rendering -- a function that will be called
   * each time the rendering is paused.  To continue rendering call the
   * function that is the first argument to the callback.
   * @type {function}
   */
  onContinue: Function
  /**
   * Promise for rendering task completion.
   * @type {Promise<void>}
   */
  get promise(): Promise<void>;
  /**
   * Cancels the rendering task. If the task is currently rendering it will
   * not be cancelled until graphics pauses with a timeout. The promise that
   * this object extends will be rejected when cancelled.
   */
  cancel(): void
}

class Member{
  props!: ContentProps
  mainUrl!: string
  document?: PDFDocumentProxy = undefined
  getDocTask?: PDFDocumentLoadingTask
  pages: PDFPageProxy[] = []
  renderTask?: RenderTask = undefined
  canvas: HTMLCanvasElement|null = null
  textDiv: HTMLDivElement|null = null
  annotationDiv: HTMLDivElement|null = null
  prevSize = [0,0]
  @observable pageNum = 1
  @observable numPages: number|undefined = undefined
  @observable showTop = true
  constructor(){
    makeObservable(this)
  }
  //  Clip page number p between 1 and numPages and return valid page number.
  clipPage(p: number){
    if (p < 1) {p = 1}
    if (this.numPages && p > this.numPages) {p = this.numPages}
    return p
  }
  //  Set or update props to this.
  updateProps(propsIn: ContentProps){
    this.props = propsIn
    const editing = contents.editing === this.props.content.id
    const url = new URL(this.props.content.url)
    this.mainUrl = url.hash ? url.href.substring(0, url.href.length - url.hash.length) : url.href
    let pageNum = 1
    if (editing){
      pageNum = this.pageNum
    }else if (url.hash.substring(0,6) === '#page='){
      pageNum = this.clipPage(Number(url.hash.substring(6)))
    }
    if (!this.document || pageNum !== this.pageNum || editing){
      //  console.log(`doc${this.document}  page=${this.pageNum} -> ${pageNum}`)
      this.pageNum = pageNum
      this.getPage(pageNum).then(()=>{
        if (this.pageNum === pageNum) this.render()
      })
    }else if(this.prevSize[0] !== this.props.content.size[0]
      || this.prevSize[1] !== this.props.content.size[1]){
      if (this.render()){
        this.prevSize = Array.from(this.props.content.size)
      }
    }
  }
  //  render pdf to canvas.
  render(){
    const page = this.pages[this.pageNum - 1]
    if (this.canvas && page){
      const viewport1 = page.getViewport({scale:1})
      const c = this.props.content
      if (c.originalSize[0] !== viewport1.width || c.originalSize[1] !== viewport1.height) {
        c.originalSize = [viewport1.width, viewport1.height]
        c.size = [c.size[0], c.size[0] * c.originalSize[1] / c.originalSize[0]]
        this.props.updateOnly(this.props.content)

        return false
      }
      const scale = CANVAS_SCALE * this.props.content.size[0] / viewport1.width
      const viewport = page.getViewport({scale})
      this.canvas.width = viewport.width
      this.canvas.height = viewport.height
      const ctx = this.canvas.getContext('2d')
      if (ctx){
        if (this.renderTask){
          this.renderTask.cancel()
        }
        this.renderTask = page.render({canvasContext: ctx, viewport})
        this.renderTask.promise.then(()=>{
          page.getTextContent().then((textContent)=>{
            // Pass the data to the method for rendering of text over the pdf canvas.
            if (this.textDiv) {
              const children = this.textDiv.childNodes
              Array.from(children.values()).forEach(c => c.remove())
              const texts: HTMLElement[] = []
              renderTextLayer({
                textContent: textContent,
                container: this.textDiv,
                viewport,
                textDivs: texts
              })
              texts.forEach(text => {
                text.style.position='absolute'
                text.style.color='transparent'
                text.style.whiteSpace='pre'
                text.style.transformOrigin='0% 0%'
                text.style.whiteSpace='nowrap'
                text.style.verticalAlign='top'
              })
            }
          })
          this.renderTask = undefined
        }).catch(reason => {
          //  console.log(`Rendering canceled reason:${reason}`)
        })
      }

      return true
    }

    return false
  }
  //  get PDF from proxy server
  getDocument(){
    const rv = new Promise<PDFDocumentProxy>((resolve, reject)=>{
      if (this.document){
        resolve(this.document)
      }else if (!this.getDocTask) {
        this.getDocTask = getDocument({
          url: getProxiedUrl(this.mainUrl),
          cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@2.7.570/cmaps/',
          cMapPacked: true,
        })
        this.getDocTask.promise.then((doc) => {
          this.document = doc
          this.numPages = doc.numPages
          resolve(this.document)
        }).catch(reason => {
          this.getDocTask = getDocument({
            url: this.mainUrl,
            cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@2.7.570/cmaps/',
            cMapPacked: true,
          })
          this.getDocTask.promise.then((doc) => {
            this.document = doc
            this.numPages = doc.numPages
            resolve(this.document)
          }).catch(reason => {
            console.error(`PDF: failed to load ${this.mainUrl}`)
            reject(reason)
          })
        })
//        task.onProgress = (progress:{loaded: number, total: number}) => {
//          console.log(`PDF progress ${progress.loaded}/${progress.total}`)
//        }
      }else{
        reject('already loading')
      }
    })

    return rv
  }
  //  get a page of pdf to render
  getPage(pageNum:number) {
    const rv = new Promise<PDFPageProxy>((resolve, reject) => {
      if (this.pages[pageNum-1]){
        resolve(this.pages[pageNum-1])
      }else{
        this.getDocument().then((doc)=>{
          doc.getPage(pageNum).then((page)=>{
            this.pages[pageNum-1] = page
            resolve(this.pages[pageNum-1])
          }).catch((reason)=> {
            reject(reason)
          })
        }).catch((reason)=> {
          reject(reason)
        })
      }
    })

    return rv
  }
  //  Update url of content and send it to the server.
  updatePageAndSendUrl(p: number){
    const page = this.clipPage(p)
    const url = `${this.mainUrl}#page=${page}`
    if (url !== this.props.content.url) {
      const c = Object.assign({}, this.props.content)
      c.url = url
      this.props.updateAndSend(c)
    }
  }
}

const stopper = pointerStoppers

export const PDF: React.FC<ContentProps> = (props:ContentProps) => {
  assert(props.content.type === 'pdf')
  const memberRef = useRef<Member>(new Member())
  const member = memberRef.current
  const refCanvas = useRef<HTMLCanvasElement>(null)
  const refTextDiv = useRef<HTMLDivElement>(null)
  const refAnnotationDiv = useRef<HTMLDivElement>(null)
  const editing = contents.editing === props.content.id

  useEffect(()=>{
    member.canvas = refCanvas.current
    member.textDiv = refTextDiv.current
    member.annotationDiv = refAnnotationDiv.current
    member.render()
    // eslint-disable-next-line  react-hooks/exhaustive-deps
  }, [refCanvas.current])

  return <div style={{overflow: 'hidden', pointerEvents: 'auto', userSelect: editing? 'text':'none'}}
    onDoubleClick = {(ev) => {
      const editing = contents.editing === props.content.id
      if (!editing) {
        ev.stopPropagation()
        ev.preventDefault()
        contents.setEditing(props.content.id)
      } }
    } >
    <canvas style={{ width:`${CANVAS_SCALE*100}%`, height:`${CANVAS_SCALE*100}%`,
      transformOrigin:'top left', transform:`scale(${1/CANVAS_SCALE})`}} ref={refCanvas} />
    <div ref={refTextDiv} style={{position:'absolute', left:0, top:0,
      width:`${CANVAS_SCALE*100}%`, height:`${CANVAS_SCALE*100}%`,
      transformOrigin:'top left', transform:`scale(${1/CANVAS_SCALE})`, lineHeight: 1,
      overflow:'hidden'}} />
    <div ref={refAnnotationDiv} />
      <Observer>{()=>{  //  update page control and canvas
        if (!editing) member.updateProps(props)
        return <PageControl page={member.pageNum} numPages={member.numPages} onSetPage={page=>{
          if (editing){
            member.pageNum = page
            member.updateProps(member.props)
          }else if (page !== member.pageNum){
            member.updatePageAndSendUrl(page)
          }
        }}/>
      }}</Observer>
  </div>
}
