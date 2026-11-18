import { randomBytes, timingSafeEqual } from "node:crypto";
import { isIPv4 } from "node:net";

export function isPrivateIpv4(ip) {
  if (!isIPv4(ip)) return false;
  const [a, b] = ip.split(".").map(Number);
  return a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}

const number = ip => ip.split(".").reduce((n, octet) => (n << 8) | Number(octet), 0);
export function sameLan(local, mask, remote) {
  return isPrivateIpv4(local) && isPrivateIpv4(remote) && isIPv4(mask) &&
    (number(local) & number(mask)) === (number(remote) & number(mask));
}

export function createLanBuildGate(local, mask, port) {
  const origin = `http://${local}:${port}`;
  const host = new URL(origin).host;
  const ticket = randomBytes(16).toString("base64url");
  const session = randomBytes(32).toString("base64url");
  function matches(value, secret) {
    return typeof value === "string" && value.length === secret.length &&
      Buffer.byteLength(value) === secret.length && timingSafeEqual(Buffer.from(value), Buffer.from(secret));
  }
  function refuse(res) {
    res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("LAN build access requires the current QR link.");
  }
  function middleware(req, res, next) {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    if (req.headers.host !== host || !sameLan(local, mask, req.socket.remoteAddress)) return refuse(res);
    if (!req.url?.startsWith("/") || req.url.startsWith("//")) return refuse(res);
    const url = new URL(req.url, origin);
    if (url.origin !== origin || (req.headers.origin && req.headers.origin !== origin)) return refuse(res);
    if (url.pathname === "/" && req.method === "GET" && url.searchParams.has("k")) {
      if (!matches(url.searchParams.get("k"), ticket)) return refuse(res);
      res.writeHead(302, {
        Location: "/",
        "Set-Cookie": `iprasm_lan=${session}; Path=/; HttpOnly; SameSite=Strict`,
      });
      return res.end();
    }
    const cookie = req.headers.cookie?.split(";").map(s => s.trim()).find(s => s.startsWith("iprasm_lan="));
    if (!matches(cookie?.slice("iprasm_lan=".length), session)) return refuse(res);
    if (url.pathname.startsWith("/api/") && ["cross-site", "same-site"].includes(req.headers["sec-fetch-site"]))
      return refuse(res);
    return next();
  }
  return { url: `${origin}/?k=${ticket}`, origin, middleware };
}
