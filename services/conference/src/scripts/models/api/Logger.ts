
export interface ILoggerHandler {
  defaultLevel: 'error' | 'warning' | 'log' | string,
  log: (msg: string, context?: string) => void
  warn: (msg: string, context?: string) => void
  error: (msg: string, context?: string) => void
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
      this.handlers.set(name, this.createHandler(name, 'log'))

      return this.handlers.get(name)
    }

  }

  private createHandler(handlerName: string, defaultLevel: string): ILoggerHandler {
    return {
      defaultLevel,
      log: this.wrappedLoggging(handlerName, console.log),
      warn: this.wrappedLoggging(handlerName, console.warn),
      error: this.wrappedLoggging(handlerName, console.error),
    }
  }

  private wrappedLoggging(handlerName: string, level: Function) {
    return (msg: string, context = '') => level(`[${handlerName}](${context}) - ${msg}`)
  }
}

export default new Logger()
