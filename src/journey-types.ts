export type DigitalKind = "app" | "gift";
export type DigitalPurchaseRequest = {
  productId: string;
  kind: DigitalKind;
  name: string;
  locale: "uz" | "uz-Cyrl" | "ru" | "en";
  requestKey: string;
  quote: {
    productRevision: number;
    settingsRevision: number;
    catalogRevision?: number;
    currency: "UZS" | "USD" | "RUB";
    totalMinor: number;
  };
};
export type JourneyProduct = {
  version: "journey-product/1";
  productId: string;
  kind: DigitalKind;
  enabled: boolean;
  revision: number;
};
export type DigitalPurchase = {
  version: "digital-purchase/1";
  orderId: string;
  requestKey: string;
  kind: DigitalKind;
  productId: string;
  name: string;
  credits: number;
  currency: string;
  totalMinor: number;
  status: string;
  seller: { name: string; phone: string; paymentDetails: string };
  gift: null | {
    id: string;
    status: string;
    credits: number;
    expiresAt: number;
    claimToken?: string;
  };
};
