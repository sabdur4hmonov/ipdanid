export function secretKinds(text: string, knownValues?: string[]): string[];
export function prohibitedHistoryPath(path: string): boolean;
export function auditHistory(
  root?: string,
  knownValues?: string[],
): {
  scope: string;
  objects: number;
  textBlobs: number;
  binaryBlobs: number;
  oversizeBlobs: number;
  knownEnvironmentValues: number;
  prohibitedPaths: string[];
  findings: { oid: string; path: string; kinds: string[] }[];
  limits: string;
};
