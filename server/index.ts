import { BusinessStore } from "./business-store.ts";
import { createServer } from "node:http";
import { randomBytes } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import "./local-config.ts";
import { DomainError } from "./store.ts";
import { KitStore } from "./kit-store.ts";
import { AdminAccess, adminRoutePermission } from "./admin-access.ts";
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
if (process.env.DATABASE_PATH !== ":memory:")
  mkdirSync(dirname(process.env.DATABASE_PATH ?? "tmp/data/iprasm.sqlite"), {
    recursive: true,
  });
const store = new KitStore(
  process.env.DATABASE_PATH ?? "tmp/data/iprasm.sqlite",
  pepper,
  paymentKey,
);
store.seed();
const business = new BusinessStore(store);
const staffAccess = new AdminAccess(store, adminToken);
const budgets = new Map<string, { start: number; count: number }>();
const authBudgets = new Map<string, { start: number; count: number }>();
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
      !(
        process.env.IP_RASM_TEST_SERVER === "1" &&
        origin === process.env.IP_RASM_TEST_ORIGIN &&
        /^http:\/\/127\.0\.0\.1:\d+$/.test(origin)
      ) &&
      ![
        "http://127.0.0.1:5173",
        "http://127.0.0.1:4173",
        "http://127.0.0.1:4310",
        "http://127.0.0.1:5183",
        "http://127.0.0.1:4183",
        "http://localhost:5183",
        "http://localhost:4183",
        "http://127.0.0.1:4194",
        "http://127.0.0.1:4195",
        "http://localhost",
        "https://localhost",
        "capacitor://localhost",
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
      budgetKey = `${ip}:${req.method === "GET" ? "read" : "write"}`,
      budget = budgets.get(budgetKey) ?? { start: Date.now(), count: 0 };
    if (Date.now() - budget.start > 60000) {
      budget.start = Date.now();
      budget.count = 0;
    }
    budget.count++;
    budgets.set(budgetKey, budget);
    if (budget.count > (req.method === "GET" ? 600 : 120))
      throw new DomainError("Rate limit exceeded; retry after one minute", 429);
    const path = new URL(req.url ?? "/", "http://127.0.0.1").pathname,
      token = (req.headers.authorization ?? "").replace(/^Bearer /, "");
    if (req.method === "GET" && path === "/api/storefront") {
      send(200, {
        settings: business.settings(),
        announcements: business.announcements(),
        serverTime: Date.now(),
      });
      return;
    }
    if (req.method === "GET" && path === "/api/catalog") {
      send(200, {
        sandbox: true,
        developmentPrices: true,
        products: store.catalog(),
      });
      return;
    }
    if (req.method === "GET" && path === "/api/health") {
      send(200, {
        sandbox: true,
        livePayments: false,
        liveMessages: false,
        apiVersion: "business-sandbox/2",
      });
      return;
    }
    if (req.method === "GET" && path === "/api/kit-profiles") {
      send(200,store.standardKit());return;
    }
    const kitRevision=path.match(/^\/api\/kit-profiles\/(\d+)$/);
    if(req.method==="GET" && kitRevision){send(200,store.standardKit(Number(kitRevision[1])));return;}
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
    if (
      req.method === "POST" &&
      /^\/api\/account\/(login|recover|register|kit)$/.test(path)
    ) {
      const attempts = authBudgets.get(ip) ?? { start: Date.now(), count: 0 };
      if (Date.now() - attempts.start > 60000) {
        attempts.start = Date.now();
        attempts.count = 0;
      }
      attempts.count++;
      authBudgets.set(ip, attempts);
      if (attempts.count > 12)
        throw new DomainError("Too many account attempts; retry later", 429);
    }
    if (path === "/api/account/login" && req.method === "POST") {
      send(200, store.login(body.email, body.password));
      return;
    }
    if (path === "/api/account/kit" && req.method === "POST") {
      send(
        200,
        store.loginKit(
          body.code,
          body.attach === true ? store.authenticate(token) : undefined,
        ),
      );
      return;
    }
    if (path === "/api/builds/key" && req.method === "GET") {
      send(200, store.buildKey());
      return;
    }
    if (path === "/api/account/recover" && req.method === "POST") {
      send(200, store.recover(body.email, body.recoveryKey, body.password));
      return;
    }
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
      const session = staffAccess.authenticate(token);
      if (path === "/api/admin/session" && req.method === "GET") {
        send(200, session);
        return;
      }
      const permission = adminRoutePermission(req.method ?? "", path);
      if (!permission || !session.permissions.includes(permission))
        throw new DomainError(
          "This staff role cannot perform that action",
          403,
        );
      const actor = session.id;
      if (path === "/api/admin/kits" && req.method === "GET") {
        send(200, {...store.kitAdmin(),standardKit:store.standardKit()});
        return;
      }
      if (path === "/api/admin/kits/profiles" && req.method === "POST") {
        send(200,store.setStandardKit(actor,body));return;
      }
      if (path === "/api/admin/kits/policy" && req.method === "POST") {
        send(200, store.setKitPolicy(actor, body));
        return;
      }
      if (path === "/api/admin/kits/limits" && req.method === "POST") {
        send(200, store.setKitLimit(actor, body.accountId, body.limits));
        return;
      }
      if (path === "/api/admin/kits/batch" && req.method === "POST") {
        send(
          201,
          store.issueKitBatch(actor, body.profile, body.count, body.requestKey),
        );
        return;
      }
      if (path === "/api/admin/kits/revoke" && req.method === "POST") {
        send(200, store.revokeKitBatch(actor, body.id));
        return;
      }
      if (path === "/api/admin/settings") {
        send(
          200,
          req.method === "GET"
            ? business.settings()
            : business.saveSettings(actor, body),
        );
        return;
      }
      if (path === "/api/admin/announcements") {
        send(
          req.method === "GET" ? 200 : 201,
          req.method === "GET"
            ? business.announcements(true)
            : business.publish(actor, body),
        );
        return;
      }
      const revokeAnnouncement = path.match(
        /^\/api\/admin\/announcements\/([^/]+)\/revoke$/,
      );
      if (revokeAnnouncement && req.method === "POST") {
        send(200, business.revoke(actor, revokeAnnouncement[1], body.revision));
        return;
      }

      if (path === "/api/admin/access" && req.method === "GET") {
        send(200, staffAccess.list(token));
        return;
      }
      if (path === "/api/admin/access" && req.method === "POST") {
        send(201, staffAccess.issue(token, body));
        return;
      }
      const revokeAccess = path.match(
        /^\/api\/admin\/access\/([^/]+)\/revoke$/,
      );
      if (revokeAccess && req.method === "POST") {
        send(200, staffAccess.revoke(token, revokeAccess[1]));
        return;
      }
      if (req.method === "GET") {
        const getters: Record<string, () => unknown> = {
          "/api/admin/products": () => store.products(),
          "/api/admin/orders": () => store.orders(),
          "/api/admin/support": () => store.tickets(),
          "/api/admin/audit": () => store.auditHistory(),
          "/api/admin/codes": () => store.codes(),
        };
        if (getters[path]) {
          send(200, getters[path]());
          return;
        }
      }
      if (path === "/api/admin/products" && req.method === "POST") {
        send(200, store.updateProduct(actor, body));
        return;
      }
      const reply = path.match(/^\/api\/admin\/support\/([^/]+)\/reply$/);
      if (reply && req.method === "POST") {
        send(200, store.reply(actor, reply[1], body.body, body.state));
        return;
      }
      const fulfill = path.match(/^\/api\/admin\/orders\/([^/]+)\/fulfill$/);
      if (fulfill && req.method === "POST") {
        send(200, store.fulfill(actor, fulfill[1], body.tracking));
        return;
      }
      const testPayment = path.match(
        /^\/api\/admin\/orders\/([^/]+)\/test-payment$/,
      );
      if (testPayment && req.method === "POST") {
        send(200, store.recordTestPayment(testPayment[1], actor));
        return;
      }
      const refund = path.match(/^\/api\/admin\/orders\/([^/]+)\/refund$/);
      if (refund && req.method === "POST") {
        send(200, store.refund(actor, refund[1]));
        return;
      }
      if (path === "/api/admin/codes/revoke" && req.method === "POST") {
        send(200, store.revokeHash(actor, body.hash));
        return;
      }
      if (path === "/api/admin/codes" && req.method === "POST") {
        send(
          201,
          store.issueCode(body.profile, body.quota, body.expiresAt, actor),
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
    if (path === "/api/builds/archive" && req.method === "POST") {
      send(
        200,
        store.archiveBuild(user, await validateInstruction(body.instruction)),
      );
      return;
    }
    if (path === "/api/builds/account" && req.method === "GET") {
      send(200, store.kitAccount(user));
      return;
    }
    if (path === "/api/builds/unlock" && req.method === "POST") {
      send(
        200,
        store.unlockBuild(
          user,
          body.sequenceHash,
          body.deviceId,
          body.requestKey,
        ),
      );
      return;
    }
    if (path === "/api/account" && req.method === "GET") {
      send(200, store.customer(user));
      return;
    }
    if (path === "/api/account/register" && req.method === "POST") {
      send(201, store.register(user, body.email, body.password));
      return;
    }
    if (path === "/api/account/logout" && req.method === "POST") {
      send(200, store.logout(token));
      return;
    }
    if (path === "/api/orders" && req.method === "GET") {
      send(200, store.orders(user));
      return;
    }
    if (path === "/api/support" && req.method === "GET") {
      send(200, store.tickets(user));
      return;
    }
    if (path === "/api/instructions" && req.method === "GET") {
      send(200, store.instructions(user));
      return;
    }
    const returnOrder = path.match(/^\/api\/orders\/([^/]+)\/return$/);
    if (returnOrder && req.method === "POST") {
      send(200, store.requestReturn(user, returnOrder[1]));
      return;
    }
    const getProgress = path.match(/^\/api\/instructions\/([^/]+)\/progress$/);
    if (getProgress && req.method === "GET") {
      send(200, store.progress(user, getProgress[1]));
      return;
    }
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
      send(200, { credits: store.kitBalance(user) });
      return;
    }
    if (path === "/api/codes/redeem" && req.method === "POST") {
      send(
        200,
        store.isKitCode(body.code)
          ? store.redeemKit(user, body.code)
          : store.redeemCode(user, body.code),
      );
      return;
    }
    if (path === "/api/orders" && req.method === "POST") {
      send(
        201,
        body.address?.deliveryMethod
          ? store.submitOrder(
              user,
              body.items,
              body.address,
              body.requestKey,
              body.quote,
            )
          : store.createOrder(user, body.items, body.address, body.requestKey),
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
        if (instruction?.params.accessPolicy)
          throw new DomainError(
            "Use build unlock and archive for this guide",
            400,
          );
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
const port = Number(process.env.PORT ?? 4311);
if (!Number.isInteger(port) || port < 1024 || port > 65535)
  throw new Error("Invalid local server port");
server.listen(port, "127.0.0.1", () =>
  console.log(
    `Ip Rasm local sandbox: http://127.0.0.1:${port} (no live payments or messages). Private setup: tmp/data/local-secrets.json.`,
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
