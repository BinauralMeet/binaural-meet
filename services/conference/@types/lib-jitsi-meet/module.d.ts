// Type definitions for [~THE LIBRARY NAME~] [~OPTIONAL VERSION NUMBER~]
// Project: [~THE PROJECT NAME~]
// Definitions by: [~YOUR NAME~] <[~A URL FOR YOU~]>

declare module '@libs/lib-jitsi-meet/module' {
    import JitsiTrack from "@libs/lib-jitsi-meet/JitsiTrack";

    class Transcriber {
        constructor();

        start(): void;
        stop(callback: Function): void;
        maybeMerge(): void;
        merge(): void;
        updateTransription(word: string, name: string | null): void;
        addTrack(track: JitsiTrack): void;
        removeTrack(track: JitsiTrack): void;
        getTranscription(): string;
        getState(): any;
        reset(): void;
    }

    export { Transcriber };
}

