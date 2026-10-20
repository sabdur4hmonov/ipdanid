import type { OrderOffer, OrderQuote } from "./offer-types";
export type StorefrontSettings = {
  revision: number;
  brandName: string;
  sellerName: string;
  sellerPhone: string;
  paymentDetails: string;
  pickupAddress: string;
  deliveryEnabled: boolean;
  deliveryFeeMinor: number;
  homeTitle: { uz: string; ru: string; en: string; "uz-Cyrl"?: string };
};
export const DEFAULT_STOREFRONT: StorefrontSettings = {
  revision: 0,
  brandName: "Ip Rasm",
  sellerName: "",
  sellerPhone: "",
  paymentDetails: "",
  pickupAddress: "",
  deliveryEnabled: false,
  deliveryFeeMinor: 0,
  homeTitle: { uz: "", ru: "", en: "" },
};
export type Announcement = {
  id: string;
  title: string;
  body: string;
  kind: "news" | "promotion";
  startsAt: number;
  endsAt: number;
  active: boolean;
  revision: number;
};
export type OrderCommerce = {
  currency?: import("./commerce-regions").CommerceCurrency;
  country?: import("./commerce-regions").CommerceCountry;
  shippingRevision?: number;
  method: "courier" | "pickup";
  feeMinor: number;
  sellerName: string;
  sellerPhone: string;
  paymentDetails: string;
  pickupAddress: string;
  settingsRevision: number;
  acceptedQuote?: OrderQuote;
  offer?: OrderOffer;
};
