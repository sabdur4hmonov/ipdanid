import { createHash, timingSafeEqual } from "node:crypto";

export type PaymentProvider = "click" | "payme";
export interface InvoiceRequest {
  orderId: string;
  amountMinor: number;
  requestKey: string;
}
export interface VerifiedPayment {
  provider: PaymentProvider;
  transactionId: string;
  operation:
    "check" | "prepare" | "complete" | "cancel" | "status" | "statement";
  orderId?: string;
  amountMinor?: number;
  prepareId?: number;
  providerTime?: number;
  reason?: number;
  from?: number;
  to?: number;
  rpcId?: number | string | null;
}
export class ProviderError extends Error {
  constructor(
    public code: number,
    message: string,
    public data?: string,
  ) {
    super(message);
  }
}
export interface PaymentAdapter {
  readonly provider: PaymentProvider;
  verify(
    body: Record<string, unknown>,
    authorization?: string,
  ): VerifiedPayment;
}
function safeEqual(a: string, b: string) {
  const x = Buffer.from(a),
    y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
function text(value: unknown, max = 100): string {
  if (
    (typeof value !== "string" && typeof value !== "number") ||
    !String(value).length ||
    String(value).length > max
  )
    throw new ProviderError(-32600, "Invalid request");
  return String(value);
}
export function sumToMinor(value: unknown) {
  const raw = text(value, 24);
  if (!/^\d+(\.\d{1,2})?$/.test(raw))
    throw new ProviderError(-2, "Incorrect amount");
  const [whole, fraction = ""] = raw.split(".");
  const result = Number(BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0")));
  if (!Number.isSafeInteger(result) || result <= 0)
    throw new ProviderError(-2, "Incorrect amount");
  return result;
}
export function minorToSum(value: number) {
  if (!Number.isSafeInteger(value) || value <= 0)
    throw new ProviderError(-2, "Incorrect amount");
  return `${Math.floor(value / 100)}.${String(value % 100).padStart(2, "0")}`;
}

// CLICK Shop API concatenation uses the original amount spelling, not a float
// round-trip. No source/merchant SDK code is copied.
export function clickSignature(body: Record<string, unknown>, secret: string) {
  return createHash("md5")
    .update(
      [
        body.click_trans_id,
        body.service_id,
        secret,
        body.merchant_trans_id,
        ...(String(body.action) === "1" ? [body.merchant_prepare_id] : []),
        body.amount,
        body.action,
        body.sign_time,
      ]
        .map((v) => String(v ?? ""))
        .join(""),
    )
    .digest("hex");
}
export class ClickAdapter implements PaymentAdapter {
  readonly provider = "click" as const;
  constructor(
    private serviceId: string,
    private secret: string,
  ) {
    if (!/^\d+$/.test(serviceId) || secret.length < 16)
      throw Error("Invalid Click configuration");
  }
  verify(body: Record<string, unknown>): VerifiedPayment {
    const signature = text(body.sign_string, 32).toLowerCase();
    if (
      !/^[a-f0-9]{32}$/.test(signature) ||
      !safeEqual(signature, clickSignature(body, this.secret))
    )
      throw new ProviderError(-1, "Signature verification failed");
    if (String(body.service_id) !== this.serviceId)
      throw new ProviderError(-1, "Service mismatch");
    const action = String(body.action);
    if (!["0", "1"].includes(action))
      throw new ProviderError(-3, "Unknown action");
    const transactionId = text(body.click_trans_id, 30);
    if (!/^\d+$/.test(transactionId))
      throw new ProviderError(-8, "Invalid transaction");
    const orderId = text(body.merchant_trans_id),
      amountMinor = sumToMinor(body.amount);
    const time = text(body.sign_time, 30);
    if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(time))
      throw new ProviderError(-8, "Invalid timestamp");
    const prepareId =
      action === "1" ? Number(body.merchant_prepare_id) : undefined;
    if (
      prepareId !== undefined &&
      (!Number.isSafeInteger(prepareId) || prepareId < 1)
    )
      throw new ProviderError(-6, "Transaction not found");
    const error = Number(body.error ?? 0);
    if (!Number.isSafeInteger(error))
      throw new ProviderError(-8, "Invalid provider status");
    return {
      provider: "click",
      transactionId,
      orderId,
      amountMinor,
      prepareId,
      operation: error < 0 ? "cancel" : action === "0" ? "prepare" : "complete",
      reason: error < 0 ? error : undefined,
    };
  }
}

export class PaymeAdapter implements PaymentAdapter {
  readonly provider = "payme" as const;
  constructor(
    private login: string,
    private secret: string,
  ) {
    if (!login || login.includes(":") || secret.length < 16)
      throw Error("Invalid Payme configuration");
  }
  verify(body: Record<string, unknown>, authorization = ""): VerifiedPayment {
    const expected =
      "Basic " + Buffer.from(this.login + ":" + this.secret).toString("base64");
    if (!safeEqual(authorization, expected))
      throw new ProviderError(-32504, "Authorization failed");
    const id = body.id;
    if (!(id === null || typeof id === "string" || Number.isSafeInteger(id)))
      throw new ProviderError(-32600, "Invalid RPC id");
    if (
      !body.params ||
      typeof body.params !== "object" ||
      Array.isArray(body.params)
    )
      throw new ProviderError(-32602, "Invalid parameters");
    const p = body.params as Record<string, unknown>,
      method = body.method;
    const operations: Record<string, VerifiedPayment["operation"]> = {
      CheckPerformTransaction: "check",
      CreateTransaction: "prepare",
      PerformTransaction: "complete",
      CancelTransaction: "cancel",
      CheckTransaction: "status",
      GetStatement: "statement",
    };
    if (typeof method !== "string" || !Object.hasOwn(operations, method))
      throw new ProviderError(-32601, "Method not found");
    const operation = operations[method];
    const result: VerifiedPayment = {
      provider: "payme",
      operation,
      transactionId: "",
      rpcId: id as number | string | null,
    };
    if (["check", "prepare"].includes(operation)) {
      const account = p.account as Record<string, unknown> | undefined;
      if (!account || typeof account.order_id !== "string")
        throw new ProviderError(-31050, "Order not found", "order_id");
      result.orderId = text(account.order_id);
      if (!Number.isSafeInteger(p.amount) || Number(p.amount) <= 0)
        throw new ProviderError(-31001, "Incorrect amount");
      result.amountMinor = Number(p.amount);
    }
    if (["prepare", "complete", "cancel", "status"].includes(operation))
      result.transactionId = text(p.id, 100);
    if (operation === "prepare") {
      if (!Number.isSafeInteger(p.time) || Number(p.time) < 1)
        throw new ProviderError(-32602, "Invalid timestamp");
      result.providerTime = Number(p.time);
    }
    if (operation === "cancel") {
      if (
        !Number.isInteger(p.reason) ||
        Number(p.reason) < 1 ||
        Number(p.reason) > 10
      )
        throw new ProviderError(-32602, "Invalid cancellation reason");
      result.reason = Number(p.reason);
    }
    if (operation === "statement") {
      if (
        !Number.isSafeInteger(p.from) ||
        !Number.isSafeInteger(p.to) ||
        Number(p.from) < 0 ||
        Number(p.to) < Number(p.from)
      )
        throw new ProviderError(-32602, "Invalid statement period");
      result.from = Number(p.from);
      result.to = Number(p.to);
    }
    return result;
  }
}
