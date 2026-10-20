export type PartnerTerms = {
  name: string;
  productId: string;
  enabled: boolean;
  maxKits: number;
  minBatch: number;
  maxBatch: number;
  codeDays: number;
  creditDays: number;
  tiers: { minCount: number; unitMinor: number }[];
  revision: number;
};
export type PartnerAccount = {
  id: string;
  accountId: string;
  terms: PartnerTerms;
};
export type PartnerQuote = {
  id: string;
  count: number;
  unitMinor: number;
  totalMinor: number;
  currency: "UZS";
  productId: string;
  productName: string;
  profile: string;
  quota: number;
  termsRevision: number;
  productRevision: number;
  expiresAt: number;
  codeDays: number;
  creditDays: number;
};
export type PartnerCampaign = {
  id: string;
  name: string;
  quote: PartnerQuote;
  revision: number;
  status:
    "pending" | "approved" | "issued" | "cancelled" | "expired" | "revoked";
  batchId: string | null;
  reservationExpiresAt: number | null;
  claimed: number;
  available: number;
  revoked: number;
};
