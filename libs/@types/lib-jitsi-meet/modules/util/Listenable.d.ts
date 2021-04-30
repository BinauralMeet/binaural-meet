import {EventEmitter} from 'node'

declare class Listenable {
    eventEmitter: EventEmitter
    constructor(eventEmitter = new EventEmitter())
    addListener(eventName: string, listener: Function)
    removeListener(eventName: string, listener: Function)
}
