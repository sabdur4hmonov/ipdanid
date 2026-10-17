import { createServer } from "node:http";
import { createHash, randomBytes } from "node:crypto";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

// Independent local provider simulator. Never accepts a request-supplied target.
export async function startMockPaymentProvider({
  provider,
  api,
  serviceId,
  login,
  secret,
}) {
  const target = new URL(api);
  if (
    target.protocol !== "http:" ||
    !["127.0.0.1", "localhost", "[::1]"].includes(target.hostname) ||
    target.username ||
    target.password ||
    target.search ||
    target.hash ||
    !["click", "payme"].includes(provider) ||
    !secret
  )
    throw Error(
      "Mock provider requires an explicit loopback API and synthetic credentials",
    );
  const transactions = new Map();
  const post = async (body, headers = {}) => {
    const click = provider === "click";
    const r = await fetch(api + "/payments/" + provider, {
      method: "POST",
      redirect: "error",
      headers: {
        "Content-Type": click
          ? "application/x-www-form-urlencoded"
          : "application/json",
        ...headers,
      },
      body: click ? new URLSearchParams(body).toString() : JSON.stringify(body),
    });
    if (!r.ok) throw Error("Local callback HTTP failure");
    return r.json();
  };
  const server = createServer(async (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "no-store");
    try {
      if (
        req.method !== "POST" ||
        req.url !== "/pay" ||
        !String(req.headers["content-type"]).startsWith("application/json")
      ) {
        res.writeHead(404);
        res.end("{}");
        return;
      }
      let raw = "";
      for await (const chunk of req) {
        raw += chunk;
        if (raw.length > 8000) throw Error("Request too large");
      }
      const body = JSON.parse(raw);
      if (
        typeof body.orderId !== "string" ||
        body.orderId.length > 100 ||
        !Number.isSafeInteger(body.amountMinor) ||
        body.amountMinor <= 0 ||
        typeof body.requestKey !== "string" ||
        body.requestKey.length > 100
      )
        throw Error("Invalid mock payment");
      const identity = JSON.stringify([body.orderId, body.amountMinor]);
      let entry = transactions.get(body.requestKey);
      if (entry && entry.identity !== identity)
        throw Error("Changed mock retry");
      if (!entry) {
        entry = {
          identity,
          id:
            provider === "click"
              ? String(Date.now()) + String(transactions.size + 1)
              : randomBytes(12).toString("hex"),
          time: Date.now(),
        };
        transactions.set(body.requestKey, entry);
      }
      let result;
      if (provider === "click") {
        const form = {
          click_trans_id: entry.id,
          service_id: serviceId,
          click_paydoc_id: entry.id,
          merchant_trans_id: body.orderId,
          amount:
            Math.floor(body.amountMinor / 100) +
            "." +
            String(body.amountMinor % 100).padStart(2, "0"),
          action: "0",
          error: "0",
          sign_time: new Date(entry.time)
            .toISOString()
            .slice(0, 19)
            .replace("T", " "),
        };
        const sign = () =>
          createHash("md5")
            .update(
              form.click_trans_id +
                form.service_id +
                secret +
                form.merchant_trans_id +
                (form.action === "1" ? form.merchant_prepare_id : "") +
                form.amount +
                form.action +
                form.sign_time,
            )
            .digest("hex");
        form.sign_string = sign();
        const prepared = await post(form);
        if (prepared.error !== 0) result = prepared;
        else {
          form.action = "1";
          form.merchant_prepare_id = String(prepared.merchant_prepare_id);
          form.sign_string = sign();
          result = await post(form);
        }
      } else {
        const headers = {
          Authorization:
            "Basic " + Buffer.from(login + ":" + secret).toString("base64"),
        };
        const params = {
          id: entry.id,
          time: entry.time,
          amount: body.amountMinor,
          account: { order_id: body.orderId },
        };
        const prepared = await post(
          { id: 1, method: "CreateTransaction", params },
          headers,
        );
        result = prepared.error
          ? prepared
          : await post(
              { id: 2, method: "PerformTransaction", params: { id: entry.id } },
              headers,
            );
      }
      res.end(JSON.stringify(result));
    } catch {
      res.writeHead(400);
      res.end(JSON.stringify({ error: "Local mock request failed" }));
    }
  });
  await new Promise((done, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", done);
  });
  return {
    url: "http://127.0.0.1:" + server.address().port,
    close: () => new Promise((done) => server.close(done)),
  };
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const provider = process.env.MOCK_PAYMENT_PROVIDER;
  const instance = await startMockPaymentProvider({
    provider,
    api: process.env.MOCK_PAYMENT_API,
    serviceId: process.env.CLICK_SERVICE_ID,
    login: process.env.PAYME_LOGIN,
    secret:
      provider === "click"
        ? process.env.CLICK_SECRET_KEY
        : process.env.PAYME_TEST_KEY,
  });
  console.log(
    JSON.stringify({ provider, url: instance.url, realCharges: false }),
  );
}
