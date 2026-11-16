export type BackupEnv = Record<string, string | undefined>;
export function encryptionKey(env: BackupEnv): Buffer;
export function createProductionBackup(env?: BackupEnv, kind?: "daily" | "predeploy", now?: Date): Promise<{path:string;bytes:number;kind:string;encrypted:boolean;uploaded:boolean;removed:number}>;
export function restoreProductionBackup(archive: string, destination: string, env?: BackupEnv): Promise<{directory:string;authenticated:boolean;activeDataReplaced:boolean;kitSignerIncluded:boolean}>;
export function pruneProductionBackups(directory: string): number;
export function nextDailyDelay(now?: Date): number;
