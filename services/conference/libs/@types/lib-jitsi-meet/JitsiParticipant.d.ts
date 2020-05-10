// Type definitions for [~THE LIBRARY NAME~] [~OPTIONAL VERSION NUMBER~]
// Project: [~THE PROJECT NAME~]
// Definitions by: [~YOUR NAME~] <[~A URL FOR YOU~]>

import { JitsiConference } from "./JitsiConference";

declare class JitsiParticipant {
  constructor(
    jid: string,
    conference: JitsiConference,
    displayName: string,
    hidden: boolean,
    statsID: string,
    status: any,
    identity: Object,
  );
}

export { JitsiParticipant };

