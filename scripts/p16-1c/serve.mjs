import { createServer } from "node:http";
import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
const root = resolve(
  fileURLToPath(new URL("../../output/p16-1c-review/", import.meta.url)),
);
const allowed = new Set(
  JSON.parse(readFileSync(resolve(root, "public-files.json"), "utf8")),
);
const port = 4891;
createServer((req, res) => {
  const url = new URL(req.url || "/", "http://127.0.0.1"),
    p = url.pathname === "/" ? "index.html" : url.pathname.slice(1);
  const headers = {
    "Content-Security-Policy":
      "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "Cache-Control": "no-store",
  };
  if (!["GET", "HEAD"].includes(req.method)) {
    res.writeHead(405, headers).end();
    return;
  }
  if (!allowed.has(p) || url.search) {
    res.writeHead(404, headers).end();
    return;
  }
  try {
    const f = resolve(root, p);
    res.writeHead(200, {
      ...headers,
      "Content-Type": p.endsWith(".html")
        ? "text/html; charset=utf-8"
        : p.endsWith(".jpg")
          ? "image/jpeg"
          : "image/png",
      "Content-Length": statSync(f).size,
    });
    res.end(req.method === "HEAD" ? undefined : readFileSync(f));
  } catch {
    res.writeHead(404, headers).end();
  }
}).listen(port, "127.0.0.1", () =>
  console.log(`Framing review only: http://127.0.0.1:${port}/`),
);
