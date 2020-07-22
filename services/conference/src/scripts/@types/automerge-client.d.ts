declare module 'automerge-client' {

  import * as AutoMerge from 'automerge'

   interface AutoMergeClientProps {
     socket?: WebSocket,
     save?: (data: string) => void,
     savedData?: string,
     onChange?: (docId: string, doc: AutoMerge.Doc<any>) => void,
   }

   export default class Client {
     constructor(props: AutoMergeClientProps)
     change(id: string, changer: AutoMerge.ChangeFn<any>): void
     subscribe(id: string): void
   }
  }
