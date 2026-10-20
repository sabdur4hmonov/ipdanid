import type { Instruction } from "./core/types";
import type { OrderQuote } from "./offer-types";
export type CommissionPolicy = {
  version: "commission-product/1";
  productId: string;
  enabled: boolean;
  revision: number;
};
export type Commission = {
  version: "commission/1";
  id: string;
  revision: number;
  productId: string;
  productName: string;
  instructionId: string;
  sequenceHash: string;
  artHash: string;
  lines: number;
  widthMm: number;
  heightMm: number;
  state: "requested" | "approved" | "rejected" | "accepted" | "cancelled";
  production: "queued" | "making" | "ready";
  note: string;
  approval: null | {
    productRevision: number;
    catalogRevision: number;
    settingsRevision: number;
    currency: "UZS" | "USD" | "RUB";
    priceMinor: number;
    expiresAt: number;
  };
  order: null | {
    id: string;
    status: string;
    totalMinor: number;
    currency: string;
    tracking: string[];
  };
};
export type CommissionAccept = {
  revision: number;
  requestKey: string;
  artHash: string;
  address: {
    name: string;
    phone: string;
    city: string;
    street: string;
    country: string;
    deliveryMethod: "pickup" | "courier";
  };
  quote: OrderQuote;
};
export type CommissionGuide = { artHash: string; instruction: Instruction };
