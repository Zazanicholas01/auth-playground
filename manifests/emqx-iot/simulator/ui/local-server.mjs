import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";

const port = Number(process.env.UI_PORT || 8080);
const root = new URL(".", import.meta.url).pathname;

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8"
};

createServer(async (req, res) => {
  try {
    const pathname = req.url || "/";
    const path = pathname === "/" || !pathname.includes(".") ? "/index.html" : pathname;
    const filePath = join(root, decodeURIComponent(path));
    const body = await readFile(filePath);
    const type = mimeTypes[extname(filePath)] || "application/octet-stream";
    res.writeHead(200, { "content-type": type });
    res.end(body);
  } catch {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("Not found");
  }
}).listen(port, "0.0.0.0", () => {
  console.log(`listening on http://0.0.0.0:${port}`);
});
