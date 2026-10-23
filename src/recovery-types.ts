import type { Progress } from "./core/types";

/** Account metadata, separate from immutable instructions and paid receipts. */
export type RecoveryDetails = {
  resume: { current: number; pace: number; resting: boolean } | null;
  library: {
    name: string;
    folder: string;
    bookmarks: { step: number; label: string }[];
  };
};
export type RecoverySnapshot = {
  version: "account-recovery/1";
  progress: Progress;
  details: RecoveryDetails | null;
};
export type RecoveryWrite = RecoveryDetails & {
  sequenceHash: string;
  confirmed: number;
  expectedRevision: number;
  requestKey: string;
};
