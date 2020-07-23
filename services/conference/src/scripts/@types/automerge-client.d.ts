declare module 'automerge-client' {

  import * as AutoMerge from 'automerge'

   interface AutoMergeClientProps {
     socket?: WebSocket,
     save?: (data: string) => void,
     savedData?: string,
     onChange?: (docId: string, doc: AutoMerge.Doc<any>) => void,
   }

   interface ErrorEvent extends CustomEvent {
     message: string
   }

   interface SubscribedEvent extends CustomEvent {
    id: string
   }

   export default class Client extends EventTarget {
     constructor(props: AutoMergeClientProps)
     change(id: string, changer: AutoMerge.ChangeFn<any>): void
     subscribe(id: string): void
   }
  }
