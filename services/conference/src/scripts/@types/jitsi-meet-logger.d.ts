// Type definitions for ../../../node_modules/jitsi-meet-logger/lib/Logger.js
// Project: [LIBRARY_URL_HERE]
// Definitions by: [YOUR_NAME_HERE] <[YOUR_URL_HERE]>
// Definitions: https://github.com/borisyankov/DefinitelyTyped
// getCallerInfo.!ret
declare module "jitsi-meet-logger" {

  /**
   * Constructs new logger object.
   * @param level the logging level for the new logger
   * @param id optional identifier for the logger instance.
   * @param {LoggerTransport} transports optional list of handlers(objects) for
   * the logs. The handlers must support - log, warn, error, debug, info, trace.
   * @param options optional configuration file for how the logger should behave.
   * @param {boolean} options.disableCallerInfo Whether the call site of a logger
   * method invocation should be included in the log. Defaults to false, so the
   * call site will be included.
   */
  interface ILogger {
    /**
     *
     * @param level
     * @param id
     * @param transports
     * @param options
     */
    new (level : any, id : any, transports : any, options : any): ILogger;

    /**
     * Sets the log level for the logger.
     * @param level the new log level.
     * @param level
     */
    setLevel(level : any): void;

    setLogLevel(level: any): void;


    /**
     * Adds given {@link LoggerTransport} instance to the list of global
     * transports which means that it'll be used by all {@link Logger}s
     * @param {LoggerTransport} transport
     * @param transport
     */
    addGlobalTransport(transport : any): void;

    /**
     * Removes given {@link LoggerTransport} instance from the list of global
     * transports
     * @param {LoggerTransport} transport
     * @param transport
     */
    removeGlobalTransport(transport : any): void;

    /**
     * Sets global options which will be used by all loggers. Changing these works
     * even after other loggers are created.
     * @param options
     */
    setGlobalOptions(options : any): void;

    /**
     * Enum for the supported log levels.
     */
    levels : {

      /**
       *
       */
      TRACE : string;

      /**
       *
       */
      DEBUG : string;

      /**
       *
       */
      INFO : string;

      /**
       *
       */
      LOG : string;

      /**
       *
       */
      WARN : string;

      /**
       *
       */
      ERROR : string;
    }
  }
  function getLogger(id:any, transports:any, options:any): ILogger;
}
