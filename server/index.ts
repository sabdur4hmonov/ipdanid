import { allowedOrigin } from "./runtime-config.ts";
import { ProductionAdminAuth } from "./production-auth.ts";
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
import { Payments } from "./payments.ts";
import { pushAdapter } from "./fcm-adapter.ts";
import { PushStore } from "./push-store.ts";
import { GalleryStore } from "./gallery-store.ts";
import { OfferStore } from "./offer-store.ts";
const production = process.env.NODE_ENV === "production";
const notificationAdapter = pushAdapter(process.env);
const adminToken = production
  ? randomBytes(32).toString("base64url")
  : (process.env.LOCAL_ADMIN_TOKEN ?? randomBytes(32).toString("base64url"));
const pepper = process.env.CODE_PEPPER ?? randomBytes(32).toString("base64url"),
  paymentKey =
    process.env.SANDBOX_PAYMENT_KEY ?? randomBytes(32).toString("base64url");
if (process.env.DATABASE_PATH !== ":memory:")
  mkdirSync(dirname(process.env.DATABASE_PATH ?? "tmp/data/iprasm.sqlite"), {
    recursive: true,
  });
const store = new KitStore(
  process.env.DATABASE_PATH ?? "tmp/data/iprasm.sqlite",
  pepper,
  paymentKey,
);
if (!production) store.seed();
const business = new BusinessStore(store);
const gallery = new GalleryStore(store);
const offers = new OfferStore(store);
const push = new PushStore(store, pepper, notificationAdapter, (id) =>
  business.announcements(true).find((a) => a.id === id),
);
const pushTimer =
  notificationAdapter.mode !== "disabled"
    ? setInterval(() => {
        void push.drain().catch(() => {});
      }, 2000).unref()
    : undefined;
const ownerAuth = production
  ? new ProductionAdminAuth(store, process.env.ADMIN_PASSWORD_HASH!)
  : undefined;
const staffAccess = new AdminAccess(store, adminToken, ownerAuth);
// Sandbox adapters remain separate from the blocked production-auth work.
const payments = new Payments(store, {
  mode: process.env.PAYMENTS_SANDBOX === "1" ? "sandbox" : "disabled",
  mockCheckout: !production && process.env.IP_RASM_TEST_SERVER === "1",
  ...(process.env.CLICK_SECRET_KEY && process.env.CLICK_SERVICE_ID
    ? {
        click: {
          serviceId: process.env.CLICK_SERVICE_ID,
          secret: process.env.CLICK_SECRET_KEY,
        },
      }
    : {}),
  ...(process.env.PAYME_TEST_KEY && process.env.PAYME_LOGIN
    ? {
        payme: {
          login: process.env.PAYME_LOGIN,
          secret: process.env.PAYME_TEST_KEY,
        },
      }
    : {}),
});
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
    const origin = req.headers.origin;
    if (origin && !allowedOrigin(origin, process.env))
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
    const url = new URL(req.url ?? "/", "http://127.0.0.1"),
      path = url.pathname,
      token = (req.headers.authorization ?? "").replace(/^Bearer /, "");
    if (req.method === "GET" && path === "/api/gallery") {
      send(200, gallery.page(url.searchParams.get("after") ?? undefined));
      return;
    }
    const publicGalleryImage = path.match(
      /^\/api\/gallery\/([a-f0-9-]{36})\/image$/,
    );
    if (req.method === "GET" && publicGalleryImage) {
      send(200, gallery.publicImage(publicGalleryImage[1]));
      return;
    }
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
        developmentPrices: !production,
        products: store.catalog(),
      });
      return;
    }
    if (req.method === "GET" && path === "/api/health") {
      send(200, {
        sandbox: !production,
        adminAuth: production ? "password" : "token",
        livePayments: false,
        liveMessages: notificationAdapter.mode === "fcm",
        apiVersion: production ? "product-api/3" : "business-sandbox/2",
      });
      return;
    }
    if (req.method === "GET" && path === "/api/kit-profiles") {
      send(200, store.standardKit());
      return;
    }
    if (req.method === "GET" && path === "/api/push/config") {
      const web =
        notificationAdapter.mode === "fcm" &&
        process.env.FCM_WEB_API_KEY &&
        process.env.FCM_WEB_APP_ID &&
        process.env.FCM_SENDER_ID &&
        process.env.FCM_VAPID_PUBLIC_KEY
          ? {
              apiKey: process.env.FCM_WEB_API_KEY,
              appId: process.env.FCM_WEB_APP_ID,
              projectId: process.env.FCM_PROJECT_ID,
              messagingSenderId: process.env.FCM_SENDER_ID,
              vapidKey: process.env.FCM_VAPID_PUBLIC_KEY,
            }
          : null;
      send(200, {
        mode: notificationAdapter.mode,
        enabled: notificationAdapter.mode !== "disabled",
        web,
      });
      return;
    }
    const kitRevision = path.match(/^\/api\/kit-profiles\/(\d+)$/);
    if (req.method === "GET" && kitRevision) {
      send(200, store.standardKit(Number(kitRevision[1])));
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
    const clickForm =
      path === "/api/payments/click" &&
      String(req.headers["content-type"]).startsWith(
        "application/x-www-form-urlencoded",
      );
    const body = raw
      ? clickForm
        ? Object.fromEntries(new URLSearchParams(raw))
        : JSON.parse(raw)
      : {};
    if (req.method === "GET" && path === "/api/payments/config") {
      send(200, payments.availability());
      return;
    }
    if (
      req.method === "POST" &&
      (path === "/api/payments/click" || path === "/api/payments/payme")
    ) {
      send(
        200,
        payments.callback(
          path.endsWith("click") ? "click" : "payme",
          body,
          String(req.headers.authorization ?? ""),
        ),
      );
      return;
    }
    if (
      req.method === "POST" &&
      (/^\/api\/account\/(login|recover|register|kit)$/.test(path) ||
        path === "/api/admin/login")
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
    if (path === "/api/admin/login" && req.method === "POST" && ownerAuth) {
      send(200, await ownerAuth.login(body.password));
      return;
    }
    if (path.startsWith("/api/admin/")) {
      const session = staffAccess.authenticate(token);
      if (path === "/api/admin/session" && req.method === "GET") {
        send(200, session);
        return;
      }
      if (path === "/api/admin/logout" && req.method === "POST" && ownerAuth) {
        ownerAuth.revoke(token);
        send(200, { signedOut: true });
        return;
      }
      const permission = adminRoutePermission(req.method ?? "", path);
      if (!permission || !session.permissions.includes(permission))
        throw new DomainError(
          "This staff role cannot perform that action",
          403,
        );
      const actor = session.id;
      if (path === "/api/admin/offers" && req.method === "GET") {
        send(200, { codes: offers.codes(), policy: offers.policy() });
        return;
      }
      if (path === "/api/admin/offers/codes" && req.method === "POST") {
        send(200, offers.saveCode(actor, body));
        return;
      }
      if (path === "/api/admin/offers/policy" && req.method === "POST") {
        send(200, offers.savePolicy(actor, body));
        return;
      }
      if (path === "/api/admin/offers/report" && req.method === "GET") {
        send(200, offers.report());
        return;
      }
      const actualCostPath = path.match(
        /^\/api\/admin\/orders\/([a-f0-9-]{36})\/costs$/,
      );
      if (actualCostPath && req.method === "POST") {
        send(200, offers.saveCosts(actor, actualCostPath[1], body));
        return;
      }
      if (path === "/api/admin/gallery" && req.method === "GET") {
        send(
          200,
          gallery.moderation(
            url.searchParams.get("state") ?? "pending",
            url.searchParams.get("after") ?? undefined,
          ),
        );
        return;
      }
      const adminGalleryImage = path.match(
        /^\/api\/admin\/gallery\/([a-f0-9-]{36})\/image$/,
      );
      if (adminGalleryImage && req.method === "GET") {
        send(200, gallery.moderatorImage(adminGalleryImage[1]));
        return;
      }
      const moderateGallery = path.match(
        /^\/api\/admin\/gallery\/([a-f0-9-]{36})\/moderate$/,
      );
      if (moderateGallery && req.method === "POST") {
        send(200, gallery.moderate(actor, moderateGallery[1], body));
        return;
      }
      if (path === "/api/admin/push/status" && req.method === "GET") {
        send(200, push.status());
        return;
      }
      if (path === "/api/admin/push/enqueue" && req.method === "POST") {
        send(201, push.enqueue(actor, body));
        return;
      }
      if (path === "/api/admin/kits" && req.method === "GET") {
        send(200, { ...store.kitAdmin(), standardKit: store.standardKit() });
        return;
      }
      if (path === "/api/admin/kits/profiles" && req.method === "POST") {
        send(200, store.setStandardKit(actor, body));
        return;
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
    if (path === "/api/offers/quote" && req.method === "POST") {
      if (!body || Object.keys(body).sort().join(",") !== "code,items,method")
        throw new DomainError("Invalid offer fields");
      send(200, offers.quote(user, body.items, body.method, body.code));
      return;
    }
    if (
      path === "/api/referrals" &&
      ["GET", "POST"].includes(req.method ?? "")
    ) {
      if (req.method === "POST" && Object.keys(body).length)
        throw new DomainError("Invalid referral fields");
      send(200, offers.referral(user, req.method === "POST"));
      return;
    }
    if (path === "/api/gallery/mine" && req.method === "GET") {
      send(200, gallery.mine(user));
      return;
    }
    if (path === "/api/gallery/submit" && req.method === "POST") {
      send(201, gallery.submit(user, body));
      return;
    }
    const ownGalleryImage = path.match(
      /^\/api\/gallery\/mine\/([a-f0-9-]{36})\/image$/,
    );
    if (ownGalleryImage && req.method === "GET") {
      send(200, gallery.ownImage(user, ownGalleryImage[1]));
      return;
    }
    const withdrawGallery = path.match(
      /^\/api\/gallery\/([a-f0-9-]{36})\/withdraw$/,
    );
    if (withdrawGallery && req.method === "POST") {
      if (!body || Object.keys(body).join(",") !== "revision")
        throw new DomainError("gallery/fields");
      send(200, gallery.withdraw(user, withdrawGallery[1], body.revision));
      return;
    }
    if (path === "/api/push/devices" && req.method === "GET") {
      send(200, push.list(user));
      return;
    }
    if (path === "/api/push/devices" && req.method === "POST") {
      send(200, push.register(user, body));
      return;
    }
    if (path === "/api/push/revoke" && req.method === "POST") {
      send(200, push.revoke(user, body));
      return;
    }
    if (req.method === "POST" && path === "/api/payments/invoices") {
      send(
        201,
        payments.createInvoice(
          user,
          body.provider,
          body.orderId,
          body.requestKey,
        ),
      );
      return;
    }
    const invoicePath = path.match(/^\/api\/payments\/invoices\/([a-f0-9-]+)$/);
    if (req.method === "GET" && invoicePath) {
      send(200, payments.orderStatus(user, invoicePath[1]));
      return;
    }
    const invoiceAction = path.match(
      /^\/api\/payments\/invoices\/([a-f0-9-]+)\/(cancel|mock)$/,
    );
    if (req.method === "POST" && invoiceAction) {
      if (
        invoiceAction[2] === "mock" &&
        !["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(
          req.socket.remoteAddress ?? "",
        )
      )
        throw new DomainError("Mock checkout is local only", 403);
      send(
        200,
        invoiceAction[2] === "cancel"
          ? payments.cancelInvoice(user, invoiceAction[1])
          : payments.simulate(user, invoiceAction[1]),
      );
      return;
    }
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
      push.revokeAccount(user);
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
server.listen(
  port,
  production ? (process.env.HOST ?? "0.0.0.0") : "127.0.0.1",
  () =>
    console.log(
      `Ip Rasm ${production ? "production API" : "local sandbox"} ready on port ${port}; live payments disabled.`,
    ),
);
const cleanup = setInterval(() => {
  store.expireReservations();
  store.expireGifts();
  gallery.prune();
  offers.prune();
}, 60_000);
cleanup.unref();
process.on("SIGINT", () =>
  server.close(() => {
    if (pushTimer) clearInterval(pushTimer);
    store.close();
    process.exit(0);
  }),
);
