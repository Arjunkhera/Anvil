export interface SyncDaemonOptions {
    notesPath: string;
    gitPullInterval?: number;
    debounceMs?: number;
    qmdCollection?: string;
    onReindex?: () => Promise<void>;
}
export declare class SyncDaemon {
    private gitInterval?;
    private watcher?;
    private debounceTimer?;
    private isRunning;
    private opts;
    constructor(opts: SyncDaemonOptions);
    start(): void;
    stop(): void;
    private startGitPullLoop;
    private startFileWatcher;
    private triggerReindex;
    private log;
}
//# sourceMappingURL=daemon.d.ts.map