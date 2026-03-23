import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";

const port = Number(process.env.UI_PORT || 8081);
const root = new URL(".", import.meta.url).pathname;
const upstreamBase = process.env.IOT_UPSTREAM_BASE || "http://127.0.0.1:8080";

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png"
};

createServer(async (req, res) => {
  try {
    const pathname = req.url || "/";
    const path = pathname === "/" || !pathname.includes(".") ? "/index.html" : pathname;
    const filePath = join(root, decodeURIComponent(path));
    let body = await readFile(filePath);

    if (path === "/index.html") {
      const configScript = `
<script>
window.__IOT_CONFIG__ = {
  apiBase: ${JSON.stringify(upstreamBase)},
  simulatorBase: ${JSON.stringify(upstreamBase)}
};
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
  } catch {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("Not found");
  }
}).listen(port, "0.0.0.0", () => {
  console.log(`listening on http://0.0.0.0:${port}`);
  console.log(`apiBase -> ${upstreamBase}`);
});
