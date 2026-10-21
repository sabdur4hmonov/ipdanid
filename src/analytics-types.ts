export type AnalyticsPreferences = {
  revision: number;
  enabled: boolean;
  since: number | null;
  retentionDays: 90;
};
export type AnalyticsEvent = { requestKey: string; consentRevision: number } & (
  | {
      kind: "photo-selected" | "preview-ready";
      shape: "circle" | "square" | "heart";
    }
  | {
      kind: "assembly-confirmed";
      sequenceHash: string;
      revision: number;
      confirmed: number;
      total: number;
    }
);
export type AnalyticsReport = {
  version: "opt-in-metrics/1";
  from: number;
  until: number;
  consentedAccounts: number;
  funnel: {
    photos: number;
    previews: number;
    unlocked: number;
    started: number;
    completed: number;
  };
  assembly: {
    selfReported: true;
    guidesStarted: number;
    guidesCompleted: number;
    buckets: { bucket: number; guides: number }[];
  };
  commerce: {
    paidOrders: number;
    repeatBuyers: number;
    refundedOrders: number;
  };
  support: {
    tickets: number;
    answered: number;
    averageFirstReplyHours: number | null;
  };
};
