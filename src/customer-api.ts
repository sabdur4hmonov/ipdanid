import {
  nativeConfiguredBase,
  nativeServerEditing,
} from "./native-server-settings";
import { resolveBackendUrl } from "./backend-url";
import { Capacitor, CapacitorHttp } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
const base = resolveBackendUrl(
  Capacitor.isNativePlatform(),
  nativeConfiguredBase(
    import.meta.env.VITE_NATIVE_API_BASE,
    nativeServerEditing,
  ),
);
const legacyKey = "iprasm.customer.product-4311.v1";
const KEY =
  !Capacitor.isNativePlatform() || base === "http://127.0.0.1:4311/api"
    ? legacyKey
    : `${legacyKey}:${encodeURIComponent(base ?? "unconfigured")}`;
export const customerCacheNamespace = KEY;
type Session = { id: string; token: string; email?: string };
export class CustomerApi {
  session: Session | null = null;
  async restore() {
    const raw = Capacitor.isNativePlatform()
      ? (await Preferences.get({ key: KEY })).value
      : localStorage.getItem(KEY);
    if (raw) {
      try {
        const s = JSON.parse(raw);
        if (typeof s.id === "string" && typeof s.token === "string")
          this.session = {
            id: s.id,
            token: s.token,
            ...(typeof s.email === "string" ? { email: s.email } : {}),
          };
      } catch {
        /* corrupted credential must never crash local artwork */
      }
    }
  }
  async retain(session: Session | null) {
    this.session = session;
    if (Capacitor.isNativePlatform()) {
      if (session)
        await Preferences.set({ key: KEY, value: JSON.stringify(session) });
      else await Preferences.remove({ key: KEY });
    } else if (session) localStorage.setItem(KEY, JSON.stringify(session));
    else localStorage.removeItem(KEY);
  }
  async request<T>(
    path: string,
    body?: unknown,
    token = this.session?.token,
  ): Promise<T> {
    if (!base)
      throw new ApiError(
        503,
        "Backend URL is not configured; local artwork remains available",
      );
    const controller = new AbortController(),
      timer = setTimeout(() => controller.abort(), 12000);
    try {
      if (Capacitor.isNativePlatform()) {
        const response = await CapacitorHttp.request({
          url: base + path,
          method: body === undefined ? "GET" : "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          ...(body !== undefined ? { data: body } : {}),
          responseType: "json",
          connectTimeout: 8000,
          readTimeout: 12000,
          disableRedirects: true,
        });
        const data =
          typeof response.data === "string"
            ? JSON.parse(response.data)
            : response.data;
        if (response.status < 200 || response.status >= 300)
          throw new ApiError(response.status, data?.error ?? "Request failed");
        return data as T;
      }
      const response = await fetch(base + path, {
        method: body === undefined ? "GET" : "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
        signal: controller.signal,
      });
      const data = await response.json();
      if (!response.ok)
        throw new ApiError(response.status, data.error ?? "Request failed");
      return data as T;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(0, "Server unavailable");
    } finally {
      clearTimeout(timer);
    }
  }
  async connect() {
    const s = await this.request<Session>("/session", {}, "");
    await this.retain(s);
    return s;
  }
  async authenticate(mode: "register" | "login" | "recover", body: unknown) {
    const s = await this.request<Session & { recoveryKey?: string }>(
      `/account/${mode}`,
      body,
    );
    await this.retain({ id: s.id, token: s.token, email: s.email });
    return s;
  }
  async logout() {
    let failure: unknown;
    try {
      await this.request("/account/logout", {});
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 401) failure = error;
    } finally {
      await this.retain(null);
    }
    if (failure) throw failure;
  }
}
export const customerApi = new CustomerApi();
