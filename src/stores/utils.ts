import {IObservable, observable} from 'mobx'

export function shallowObservable<T extends Object>(obj: T) {
  return observable(obj, undefined, {deep: false})
}

// Convention: a store class `implements Store<IXxx>` where IXxx is the matching
// model-side interface (imported aliased, e.g. `RemoteParticipant as IRemoteParticipant`).
// This mapped type widens each property to also accept its mobx-observable-boxed
// form, so a plain model interface can be satisfied by an observable store class
// without needing a parallel, hand-written observable-aware interface.
export type Store<T> = {
  [K in keyof T]: T[K] | (T[K] & IObservable)
}
