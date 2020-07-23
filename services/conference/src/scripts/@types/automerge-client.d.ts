declare module 'automerge-client' {

  import * as AutoMerge from 'automerge'

   interface AutoMergeClientProps {
     socket?: WebSocket,
     save?: (data: string) => void,
     savedData?: string,
     onChange?: (docId: string, doc: AutoMerge.Doc<any>) => void,
   }

   interface ClientEventKeyMap {
     "error": DetailedEvent<ErrorDetail>
     "subscribed": DetailedEvent<SubscribedDetail>
     "automerge": DetailedEvent<AutomergeDetail>,
   }

   interface DetailedEvent<T> extends Event {
    readonly detail: T
   }

   interface ErrorDetail extends Event {
     readonly message: string
   }

   interface SubscribedDetail extends Event {
    readonly id: string
   }

   interface AutomergeDetail extends Event {
     readonly data: AutoMerge.Message
   }

   export default class Client extends EventTarget {
    docs: {
      [key: string]: AutoMerge.Doc<any>
    }
    socket: WebSocket

     constructor(props: AutoMergeClientProps)
     change(id: string, changer: AutoMerge.ChangeFn<any>): void
     subscribe(id: string): void

     addEventListener<K extends keyof ClientEventKeyMap>(type: K, listener: (this: Client, event: ClientEventKeyMap[K]) => any, options?: boolean | AddEventListenerOptions): void
     addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void
   }
  }
