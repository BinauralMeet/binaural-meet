
export interface ILoggerHandler {
  defaultLevel: 'error' | 'warning' | 'log' | string,
  log: (msg: string) => void
  warn: (msg: string) => void
  error: (msg: string) => void
}

class Logger {
  public handlers: Map<string, ILoggerHandler>

  constructor() {
    this.handlers = new Map()
  }

  public setHandler(name: string): ILoggerHandler | undefined {
    if (this.handlers.has(name)) {
      throw 'Duplicate handler name'
    } else {
      this.handlers.set(name, this._createHandler(name, 'log'))
      return this.handlers.get(name)
    }

  }

  private _createHandler(handlerName: string, defaultLevel: string): ILoggerHandler {
    return {
      defaultLevel,
      log: this._wrappedLoggging(handlerName, console.log),
      warn: this._wrappedLoggging(handlerName, console.warn),
      error: this._wrappedLoggging(handlerName, console.error),
    }
  }

  private _wrappedLoggging(handlerName: string, level: Function) {
    return (msg: string) => level(`[${handlerName}] - ${msg}`)
  }
}

export default new Logger()
