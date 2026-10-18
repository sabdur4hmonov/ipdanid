import { createPrivateKey, sign, type KeyObject } from "node:crypto";
export interface PushMessage {
  token: string;
  title: string;
  body: string;
  tag: string;
  ttl: number;
}
export interface PushAdapter {
  readonly mode: "disabled" | "mock" | "fcm";
  send(message: PushMessage): Promise<{ id: string }>;
}
export class PushFailure extends Error {
  constructor(
    public retryable: boolean,
    public invalidToken = false,
    public retryAfterMs = 60000,
  ) {
    super("Push provider request failed");
  }
}
type Fetcher = (url: string, init?: RequestInit) => Promise<Response>;
export class FcmAdapter implements PushAdapter {
  readonly mode = "fcm" as const;
  private key: KeyObject;
  private token?: { value: string; until: number };
  private acquiring?: Promise<string>;
  constructor(
    private config: {
      project: string;
      email: string;
      privateKey: string;
      origin: string;
    },
    private fetcher: Fetcher = fetch,
    private now = Date.now,
  ) {
    if (
      !/^[a-z][a-z0-9-]{4,62}[a-z0-9]$/.test(config.project) ||
      !/^[^\s@]+@[^\s@]+\.gserviceaccount\.com$/.test(config.email)
    )
      throw Error("Invalid push configuration");
    try {
      const url = new URL(config.origin);
      if (
        url.protocol !== "https:" ||
        url.username ||
        url.password ||
        url.search ||
        url.hash ||
        url.pathname !== "/"
      )
        throw Error();
      this.config.origin = url.origin;
    } catch {
      throw Error("Invalid push configuration");
    }
    try {
      this.key = createPrivateKey(config.privateKey.replace(/\\n/g, "\n"));
      if (
        this.key.asymmetricKeyType !== "rsa" ||
        (this.key.asymmetricKeyDetails?.modulusLength ?? 0) < 2048
      )
        throw Error();
    } catch {
      throw Error("Invalid push configuration");
    }
  }
  private accessToken() {
    if (this.token && this.token.until > this.now())
      return Promise.resolve(this.token.value);
    return (this.acquiring ??= this.acquire().finally(() => {
      this.acquiring = undefined;
    }));
  }
  private async acquire() {
    const enc = (v: object) =>
        Buffer.from(JSON.stringify(v)).toString("base64url"),
      at = Math.floor(this.now() / 1000),
      payload =
        enc({ alg: "RS256", typ: "JWT" }) +
        "." +
        enc({
          iss: this.config.email,
          scope: "https://www.googleapis.com/auth/firebase.messaging",
          aud: "https://oauth2.googleapis.com/token",
          iat: at,
          exp: at + 3600,
        }),
      assertion =
        payload +
        "." +
        sign("RSA-SHA256", Buffer.from(payload), this.key).toString(
          "base64url",
        );
    try {
      const r = await this.fetcher("https://oauth2.googleapis.com/token", {
          method: "POST",
          signal: AbortSignal.timeout(8000),
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
            assertion,
          }).toString(),
        }),
        body = await r.json();
      if (
        !r.ok ||
        typeof body.access_token !== "string" ||
        body.access_token.length < 10 ||
        !Number.isFinite(body.expires_in) ||
        body.expires_in < 120 ||
        body.expires_in > 3600
      )
        throw new PushFailure(r.status >= 500 || r.status === 429);
      this.token = {
        value: body.access_token,
        until: this.now() + (body.expires_in - 60) * 1000,
      };
      return body.access_token as string;
    } catch (e) {
      if (e instanceof PushFailure) throw e;
      throw new PushFailure(true);
    }
  }
  async send(m: PushMessage) {
    const token = await this.accessToken();
    try {
      const r = await this.fetcher(
          `https://fcm.googleapis.com/v1/projects/${this.config.project}/messages:send`,
          {
            method: "POST",
            signal: AbortSignal.timeout(10000),
            headers: {
              Authorization: "Bearer " + token,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              message: {
                token: m.token,
                notification: { title: m.title, body: m.body },
                data: { tag: m.tag, url: "/" },
                android: {
                  collapse_key: m.tag,
                  ttl: `${m.ttl}s`,
                  notification: { tag: m.tag, channel_id: "iprasm-news" },
                },
                webpush: {
                  headers: { TTL: String(m.ttl) },
                  notification: { tag: m.tag },
                  fcm_options: { link: this.config.origin + "/" },
                },
              },
            }),
          },
        ),
        body = await r.json();
      if (r.ok && typeof body.name === "string") return { id: body.name };
      if (r.status === 401) this.token = undefined;
      const invalid =
          Array.isArray(body?.error?.details) &&
          body.error.details.some(
            (d: { errorCode?: string }) => d.errorCode === "UNREGISTERED",
          ),
        retry = r.status === 401 || r.status === 429 || r.status >= 500;
      const header = r.headers.get("Retry-After") || "60",
        seconds = Number(header),
        delay = Number.isFinite(seconds)
          ? seconds * 1000
          : Date.parse(header) - this.now();
      throw new PushFailure(
        retry,
        invalid,
        Number.isFinite(delay)
          ? Math.min(3600000, Math.max(60000, delay))
          : 60000,
      );
    } catch (e) {
      if (e instanceof PushFailure) throw e;
      throw new PushFailure(true);
    }
  }
}
export class MockPushAdapter implements PushAdapter {
  readonly mode = "mock" as const;
  readonly sent: PushMessage[] = [];
  async send(message: PushMessage) {
    this.sent.push(structuredClone(message));
    return { id: "mock-" + this.sent.length };
  }
}
export function pushAdapter(env: NodeJS.ProcessEnv): PushAdapter {
  if (!env.FCM_MODE || env.FCM_MODE === "disabled")
    return {
      mode: "disabled",
      async send() {
        throw new PushFailure(false);
      },
    };
  if (
    env.FCM_MODE === "mock" &&
    env.IP_RASM_TEST_SERVER === "1" &&
    env.NODE_ENV !== "production"
  )
    return new MockPushAdapter();
  if (env.FCM_MODE !== "fcm") throw Error("Invalid push mode");
  return new FcmAdapter({
    project: env.FCM_PROJECT_ID ?? "",
    email: env.FCM_CLIENT_EMAIL ?? "",
    privateKey: env.FCM_PRIVATE_KEY ?? "",
    origin: env.APP_ORIGIN ?? "",
  });
}
