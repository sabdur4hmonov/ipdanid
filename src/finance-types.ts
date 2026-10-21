export type FinanceOrder = {
  id: string;
  status:
    | "pending"
    | "paid"
    | "fulfilled"
    | "return_requested"
    | "refunded"
    | "cancelled";
  amountMinor: number;
  currency: string;
  settlement: "manual" | "sandbox" | "none";
  settlementCount: number;
  invoices: {
    id: string;
    provider: "click" | "payme";
    state: number;
    amountMinor: number;
  }[];
  problems: string[];
};
export type FinanceComparison = {
  id: string;
  createdAt?: number;
  bankVerified: false;
  source: string;
  results: { invoiceId: string; result: string }[];
};
export type FinanceReport = {
  bankVerified: false;
  scope: "local-records-only";
  orders: FinanceOrder[];
  comparisons: FinanceComparison[];
};
export type ManualMoneyAction = {
  requestKey: string;
  amountMinor: number;
  currency: string;
  reference: string;
  received?: true;
  returned?: true;
};
