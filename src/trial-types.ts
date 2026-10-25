export type TrialPolicy = {
  version: "instagram-trial/1";
  revision: number;
  enabled: boolean;
  startsAt: number;
  expiresAt: number;
  maxClaims: number;
  creditDays: number;
};
export const DEFAULT_TRIAL_POLICY: Readonly<TrialPolicy> = Object.freeze({
  version: "instagram-trial/1",
  revision: 0,
  enabled: false,
  startsAt: 0,
  expiresAt: 0,
  maxClaims: 0,
  creditDays: 30,
});
export type TrialClaim = {
  duplicate: boolean;
  credits: number;
  expiresAt: number;
};
