export type S3Config = {endpoint:string;region:string;bucket:string;accessKey:string;secret:string;prefix:string};
export function s3Config(env: Record<string, string | undefined>): S3Config | null;
export function signedPut(config: S3Config, name: string, bodyHash: string, date?: Date): {url:string;headers:Record<string,string>};
export function uploadBackup(file:string, env:Record<string,string|undefined>, date?:Date, transport?:typeof fetch):Promise<boolean>;
