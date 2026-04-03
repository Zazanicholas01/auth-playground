import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";

const port = Number(process.env.UI_PORT || 8081);
const root = new URL(".", import.meta.url).pathname;
const upstreamBase = process.env.IOT_UPSTREAM_BASE || "http://127.0.0.1:8080";
const simulatorBase = process.env.IOT_SIMULATOR_BASE || `http://127.0.0.1:${port}/simulator`;
const grafanaBase = process.env.IOT_GRAFANA_BASE || upstreamBase;

const proxyPrefixes = ["/api", "/simulator"];

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png"
};

createServer(async (req, res) => {
  try {
    const requestUrl = new URL(req.url || "/", `http://127.0.0.1:${port}`);
    const pathname = requestUrl.pathname;

    if (proxyPrefixes.some((prefix) => pathname.startsWith(prefix))) {
      const targetBase = pathname.startsWith("/grafana") ? grafanaBase : upstreamBase;

      let upstreamPath = pathname;
      if (pathname.startsWith("/api/")) {
        upstreamPath = pathname.slice("/api".length);
      } else if (pathname === "/api") {
        upstreamPath = "/";
      } else if (pathname.startsWith("/simulator/")) {
        upstreamPath = pathname.slice("/simulator".length);
      } else if (pathname === "/simulator") {
        upstreamPath = "/";
      }

      const upstreamUrl = new URL(upstreamPath + requestUrl.search, targetBase);
      console.log("proxying", pathname, "->", upstreamUrl.toString());

      const headers = new Headers();
      for (const [key, value] of Object.entries(req.headers)) {
        if (value == null) continue;
        if (key.toLowerCase() === "host") continue;

        if (Array.isArray(value)) {
          for (const item of value) headers.append(key, item);
        } else {
          headers.set(key, value);
        }
      }

      const upstream = await fetch(upstreamUrl, {
        method: req.method,
        headers,
        redirect: "follow",
      });

      const blockedResponseHeaders = new Set([
        "content-encoding",
        "content-length",
        "transfer-encoding",
        "connection",
        "keep-alive",
        "upgrade",
        "proxy-authenticate",
        "proxy-authorization",
        "te",
        "trailers",
      ]);

      const responseHeaders = {};
      for (const [key, value] of upstream.headers.entries()) {
        if (blockedResponseHeaders.has(key.toLowerCase())) continue;
        responseHeaders[key] = value;
      }
      responseHeaders["cache-control"] = "no-store";

      res.writeHead(upstream.status, responseHeaders);
      res.end(Buffer.from(await upstream.arrayBuffer()));
      return;
    }

    const path =
      pathname === "/" || !pathname.includes(".")
        ? "/index.html"
        : pathname;

    const filePath = join(root, decodeURIComponent(path));
    let body = await readFile(filePath);

    if (path === "/index.html") {
      const configScript = `
        <script>
          window.__IOT_CONFIG__ = window.__IOT_CONFIG__ || {};
          window.__IOT_CONFIG__.apiBase = ${JSON.stringify(upstreamBase)};
          window.__IOT_CONFIG__.simulatorBase = ${JSON.stringify(simulatorBase)};
        </script>`;

      body = Buffer.from(
        body.toString("utf8").replace("</head>", `${configScript}\n</head>`),
        "utf8"
      );
    }

    const type = mimeTypes[extname(filePath)] || "application/octet-stream";
    res.writeHead(200, {
      "content-type": type,
      "cache-control": "no-store"
    });
    res.end(body);
  } catch (error) {
    console.error("local ui proxy error:", error);
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("Not found");
  }
}).listen(port, "0.0.0.0", () => {
  console.log(`listening on http://0.0.0.0:${port}`);
  console.log(`apiBase -> ${upstreamBase}`);
  console.log(`grafanaBase -> ${grafanaBase}`);
});
