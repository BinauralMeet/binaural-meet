// Type definitions for [~THE LIBRARY NAME~] [~OPTIONAL VERSION NUMBER~]
// Project: [~THE PROJECT NAME~]
// Definitions by: [~YOUR NAME~] <[~A URL FOR YOU~]>

declare module '@libs/lib-jitsi-meet/JitsiConnection' {
    import JitsiConference from "@libs/lib-jitsi-meet/JitsiConference";

    interface JitsiConnectionOptions {
        id: string;
        password: string;
    }
    class JitsiConnection {
        constructor(appId: string, token: string, options: Object);

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
    }

    // export function JitsiConnection(appId: string, token: string, options: Object): void;

    // export namespace JitsiConnection {
    //     export function connect(options: any): void;
    //     export function attach(options: any): void;
    //     export function disconnect(...args: any): Promise<any>;
    //     export function getJid(): string;
    //     export function setToken(token: string): void;
    //     export function initJitsiConference(name: string, options: any): JitsiConference;
    //     export function addEventListener(event: string, listener: Function): void;
    //     export function removeEventListener(event: string, listener: Function): void;
    //     export function getConnectionTimes(): number;
    //     export function addFeature(feature: string, submit: boolean): any;
    //     export function removeFeature(feature: string, submit: boolean): any;
    // }

    export default JitsiConnection;
}
