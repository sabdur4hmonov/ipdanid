import type { Locale } from "./core/types";
export const TRANSACTIONAL_KINDS = [
  "order-created",
  "order-paid",
  "order-cancelled",
  "order-sent",
  "order-return-requested",
  "order-refunded",
  "support-replied",
  "commission-approved",
  "commission-declined",
  "commission-making",
  "commission-ready",
] as const;
export type TransactionalKind = (typeof TRANSACTIONAL_KINDS)[number];
export type TransactionalPayload = {
  reference: string;
  amountMinor?: number;
  currency?: string;
};
export type InboxMessage = {
  id: string;
  kind: TransactionalKind;
  entityId: string;
  createdAt: number;
  read: boolean;
  title: string;
  body: string;
  state: string;
  mock: boolean;
};
export type MailPreferences = {
  revision: number;
  locale: Locale;
  emailOptIn: boolean;
  emailAvailable: boolean;
  configured: boolean;
  mock: boolean;
};
export type MailDeliveryReport = {
  mode: "disabled" | "mock" | "resend";
  counts: { state: string; count: number }[];
  messages: (InboxMessage & {
    attempts: number;
    polls: number;
    dueAt: number;
    error: string;
    canRetry: boolean;
  })[];
};
