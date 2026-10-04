import { createServer } from "node:http";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { mkdirSync } from "node:fs";
import { Store, DomainError } from "./store.ts";
import { validateInstruction } from "../src/core/validation.ts";
const adminToken =
  process.env.LOCAL_ADMIN_TOKEN ?? randomBytes(32).toString("base64url");
const pepper = process.env.CODE_PEPPER ?? randomBytes(32).toString("base64url"),
  paymentKey =
    process.env.SANDBOX_PAYMENT_KEY ?? randomBytes(32).toString("base64url");
if (process.env.NODE_ENV === "production")
  throw new Error(
    "This sandbox server is not a production deployment. Configure production adapters/auth/retention first.",
  );
mkdirSync("tmp/data", { recursive: true });
const store = new Store(
  process.env.DATABASE_PATH ?? "tmp/data/iprasm.sqlite",
  pepper,
  paymentKey,
);
store.seed();
const budgets = new Map<string, { start: number; count: number }>();
const server = createServer(async (req, res) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  const send = (code: number, data: unknown) => {
    res.writeHead(code);
    res.end(JSON.stringify(data));
  };
  try {
    // Loopback development server only; never allow third-party websites to mutate it.
    const origin = req.headers.origin;
    if (
      origin &&
      ![
        "http://127.0.0.1:5173",
        "http://127.0.0.1:4173",
        "http://127.0.0.1:4310",
      ].includes(origin)
    )
      throw new DomainError("Origin forbidden", 403);
    if (origin) res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    if (req.method === "OPTIONS") {
      res.setHeader(
        "Access-Control-Allow-Headers",
        "Authorization,Content-Type,X-Sandbox-Signature",
      );
      res.setHeader("Access-Control-Allow-Methods", "GET,POST");
      send(204, null);
      return;
    }
    const ip = req.socket.remoteAddress ?? "local",
      budget = budgets.get(ip) ?? { start: Date.now(), count: 0 };
    if (Date.now() - budget.start > 60000) {
      budget.start = Date.now();
      budget.count = 0;
    }
    budget.count++;
    budgets.set(ip, budget);
    if (budget.count > 90) throw new DomainError("Rate limit exceeded", 429);
    const path = new URL(req.url ?? "/", "http://127.0.0.1").pathname,
      token = (req.headers.authorization ?? "").replace(/^Bearer /, "");
    const admin = () => {
      const a = Buffer.from(token),
        b = Buffer.from(adminToken);
      if (a.length !== b.length || !timingSafeEqual(a, b))
        throw new DomainError("Administrator authorization required", 403);
    };
    if (req.method === "GET" && path === "/api/catalog") {
      send(200, {
        sandbox: true,
        developmentPrices: true,
        products: store.catalog(),
      });
      return;
    }
    if (req.method === "GET" && path === "/api/health") {
      send(200, { sandbox: true, livePayments: false, liveMessages: false });
      return;
    }
    const chunks: Buffer[] = [];
    let receivedBytes = 0;
    for await (const chunk of req) {
      receivedBytes += chunk.length;
      if (receivedBytes > 4_000_000)
        throw new DomainError("Request too large", 413);
      chunks.push(Buffer.from(chunk));
    }
    const raw = Buffer.concat(chunks).toString("utf8");
    const body = raw ? JSON.parse(raw) : {};
    if (req.method === "POST" && path === "/api/session") {
      send(201, { ...store.createGuest(), sandbox: true });
      return;
    }
    if (req.method === "POST" && path === "/api/sandbox/callback") {
      send(
        200,
        store.payment(raw, String(req.headers["x-sandbox-signature"] ?? "")),
      );
      return;
    }
    if (path.startsWith("/api/admin/")) {
      admin();
      if (path === "/api/admin/codes" && req.method === "POST") {
        send(
          201,
          store.issueCode(
            body.profile,
            body.quota,
            body.expiresAt,
            "local-admin",
          ),
        );
        return;
      }
      if (path === "/api/admin/sandbox/sign" && req.method === "POST") {
        send(200, {
          signature: store.signSandbox(JSON.stringify(body.event)),
          raw: JSON.stringify(body.event),
          sandbox: true,
        });
        return;
      }
      if (path === "/api/admin/messages" && req.method === "POST") {
        send(200, store.recordSandboxMessages());
        return;
      }
      throw new DomainError("Admin route not implemented", 404);
    }
    const user = store.authenticate(token);
    if (path === "/api/gifts" && req.method === "POST") {
      send(
        201,
        store.createGift(user, body.credits, body.expiresAt, body.requestKey),
      );
      return;
    }
    if (path === "/api/gifts/redeem" && req.method === "POST") {
      send(200, store.redeemGift(user, body.claimToken));
      return;
    }
    const giftCancel = path.match(/^\/api\/gifts\/([^/]+)\/cancel$/);
    if (giftCancel && req.method === "POST") {
      send(200, store.cancelGift(user, giftCancel[1]));
      return;
    }
    if (path === "/api/credits" && req.method === "GET") {
      send(200, { credits: store.balance(user) });
      return;
    }
    if (path === "/api/codes/redeem" && req.method === "POST") {
      send(200, store.redeemCode(user, body.code));
      return;
    }
    if (path === "/api/orders" && req.method === "POST") {
      send(
        201,
        store.createOrder(user, body.items, body.address, body.requestKey),
      );
      return;
    }
    const orderPath = path.match(/^\/api\/orders\/([^/]+)(\/cancel)?$/);
    if (orderPath) {
      if (orderPath[2] && req.method === "POST")
        send(200, store.cancelOrder(user, orderPath[1]));
      else if (req.method === "GET") send(200, store.order(user, orderPath[1]));
      else throw new DomainError("Method not supported", 405);
      return;
    }
    if (path === "/api/jobs/reserve" && req.method === "POST") {
      send(
        200,
        store.reserveGeneration(user, body.requestKey, body.sequenceHash),
      );
      return;
    }
    if (path === "/api/jobs/finish" && req.method === "POST") {
      let instruction;
      try {
        instruction = body.instruction
          ? await validateInstruction(body.instruction)
          : null;
      } catch (e) {
        store.finishGeneration(user, body.jobId, null);
        throw e;
      }
      send(200, store.finishGeneration(user, body.jobId, instruction));
      return;
    }
    const instructionPath = path.match(
      /^\/api\/instructions\/([^/]+)(\/progress)?$/,
    );
    if (instructionPath) {
      if (instructionPath[2] && req.method === "POST")
        send(
          200,
          store.saveProgress(
            user,
            instructionPath[1],
            body.progress,
            body.expectedRevision,
          ),
        );
      else if (req.method === "GET")
        send(200, store.instruction(user, instructionPath[1]));
      else throw new DomainError("Method not supported", 405);
      return;
    }
    if (path === "/api/support" && req.method === "POST") {
      send(
        201,
        store.ticket(user, body.subject, body.body, body.orderId ?? null),
      );
      return;
    }
    throw new DomainError("Route not found", 404);
  } catch (e) {
    if (e instanceof DomainError) send(e.status, { error: e.message });
    else if (e instanceof SyntaxError) send(400, { error: "Invalid JSON" });
    else send(400, { error: "Invalid request or data" });
  }
});
server.listen(4310, "127.0.0.1", () =>
  console.log(
    "Ip Rasm local sandbox: http://127.0.0.1:4310 (no live payments or messages). Administrator token is available only through your configured LOCAL_ADMIN_TOKEN; no default credentials are published.",
  ),
);
const cleanup = setInterval(() => {
  store.expireReservations();
  store.expireGifts();
}, 60_000);
cleanup.unref();
process.on("SIGINT", () =>
  server.close(() => {
    store.close();
    process.exit(0);
  }),
);
