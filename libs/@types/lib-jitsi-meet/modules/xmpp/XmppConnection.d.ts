import Listenable from '../util/Listenable'

export default class XmppConnection extends Listenable {
  static get Events()
  static get Status()

  /**
   * Initializes new connection instance.
   *
   * @param {Object} options
   * @param {String} options.serviceUrl - The BOSH or WebSocket service URL.
   * @param {String} options.shard - The BOSH or WebSocket is connecting to this shard.
   * Useful for detecting when shard changes.
   * @param {String} [options.enableWebsocketResume=true] - True/false to control the stream resumption functionality.
   * It will enable automatically by default if supported by the XMPP server.
   * @param {Number} [options.websocketKeepAlive=60000] - The websocket keep alive interval.
   * It's the interval + a up to a minute of jitter. Pass -1 to disable.
   * The keep alive is HTTP GET request to {@link options.serviceUrl} or to {@link options.websocketKeepAliveUrl}.
   * @param {Number} [options.websocketKeepAliveUrl] - The websocket keep alive url to use if any,
   * if missing the serviceUrl url will be used.
   * @param {Object} [options.xmppPing] - The xmpp ping settings.
   */
  constructor({ enableWebsocketResume, websocketKeepAlive, websocketKeepAliveUrl, serviceUrl, shard, xmppPing })

  get connected()
  get disco()
  get disconnecting()
  get domain()
  get isUsingWebSocket() : boolean
  get jid(): string|null
  get lastResponseHeaders(): string
  get options() :Object
  get pingDomain(): string | undefined
  get service(): string
  get status()
  addConnectionPlugin(name, plugin)
  addHandler(...args)
  attach(jid, sid, rid, callback, ...args)
  connect(jid, pass, callback, ...args)
  closeWebsocket()
  disconnect(...args)
  flush(...args)
  getTimeSinceLastSuccess():number|null
  getLastFailedMessage(): string|null
  send(stanza)
  sendIQ(elem:Element, callback:Function, errback:Function, timeout:number): number
  sendIQ2(iq: Element, { timeout:number })
}
