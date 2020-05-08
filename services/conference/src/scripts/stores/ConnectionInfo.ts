import { ConnectionStates } from "@models/api";
import { Store } from "./utils";

interface IConnectionInfo {
    apiVersion: string,
    state: ConnectionStates;
}

export class ConnectionInfo implements Store<IConnectionInfo> {
    apiVersion: string;
    state: ConnectionStates;

    constructor() {
        this.apiVersion = "INVALID";
        this.state = ConnectionStates.Disconnected;
    }
}

export default new ConnectionInfo();
