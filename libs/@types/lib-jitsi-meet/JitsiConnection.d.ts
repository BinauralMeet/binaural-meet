// Type definitions for [~THE LIBRARY NAME~] [~OPTIONAL VERSION NUMBER~]
// Project: [~THE PROJECT NAME~]
// Definitions by: [~YOUR NAME~] <[~A URL FOR YOU~]>

import { JitsiConference } from "./JitsiConference";

interface JitsiConnectionOptions {
  id: string;
  password: string;
}
declare class XmppConnection{
  options: any
}
declare class XMPP{
  connection: XmppConnection
}
declare class JitsiConnection {
  constructor(appId: string|null, token: string|undefined, options: Object);

  connect(options?: JitsiConnectionOptions): void;
  attach(options: any): void;
  disconnect(...args: any): Promise<any>;
  getJid(): string;
  setToken(token: string): void;
  initJitsiConference(name: string, options: any): JitsiConference;
  addEventListener(event: string, listener: Function): void;
  removeEventListener(event: string, listener: Function): void;
  getConnectionTimes(): number;
  addFeature(feature: string, submit: boolean): any;
  removeFeature(feature: string, submit: boolean): any;
  xmpp: XMPP;
}

export { JitsiConnection };
