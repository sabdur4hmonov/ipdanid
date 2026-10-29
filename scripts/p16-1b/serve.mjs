// Read-only allowlist server. Private keys, routes and metrics cannot be fetched.
import { createServer } from "node:http";
import { readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
const root = resolve(
  fileURLToPath(new URL("../../output/p16-1b-review/", import.meta.url)),
);
const allowed = new Set(
  JSON.parse(readFileSync(resolve(root, "public-files.json"), "utf8")),
);
const port = Number(process.env.P16_REVIEW_PORT || 4888);
if (
  !Number.isInteger(port) ||
  port < 1024 ||
  port > 65535 ||
  (port >= 4194 && port <= 4217)
)
  throw Error("Reserved/invalid review port");
createServer((req, res) => {
  const url = new URL(req.url || "/", "http://127.0.0.1");
  const path = url.pathname === "/" ? "index.html" : url.pathname.slice(1);
  const headers = {
    "Content-Security-Policy":
      "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'",
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "no-store",
    "Referrer-Policy": "no-referrer",
  };
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405, headers).end();
    return;
  }
  if (!allowed.has(path) || url.search) {
    res.writeHead(404, headers).end();
    return;
  }
  const type = path.endsWith(".html")
    ? "text/html; charset=utf-8"
    : path.endsWith(".jpg")
      ? "image/jpeg"
      : "image/png";
  try {
    const target = resolve(root, path);
    res.writeHead(200, {
      ...headers,
      "Content-Type": type,
      "Content-Length": statSync(target).size,
    });
    res.end(req.method === "HEAD" ? undefined : readFileSync(target));
  } catch {
    res.writeHead(404, headers).end();
  }
}).listen(port, "127.0.0.1", () =>
  console.log(`Blind review only: http://127.0.0.1:${port}/`),
);
