export type DigitalKind = "app" | "gift";
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
  kind: DigitalKind;
  productId: string;
  name: string;
  credits: number;
  currency: string;
  totalMinor: number;
  status: string;
  gift: null | {
    id: string;
    status: string;
    credits: number;
    expiresAt: number;
    claimToken?: string;
  };
};
