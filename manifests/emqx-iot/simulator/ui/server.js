const port = Number(process.env.UI_PORT || 8080);

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8"
};

const server = Bun?.serve
  ? Bun.serve({
      port,
      async fetch(request) {
        const url = new URL(request.url);
        const path = url.pathname === "/" || !url.pathname.includes(".")
          ? "/index.html"
          : url.pathname;
        const file = Bun.file("/src" + path);

        if (!(await file.exists())) {
          return new Response("Not found", { status: 404 });
        }

        const headers = new Headers();
        const ext = path.slice(path.lastIndexOf("."));
        if (mimeTypes[ext]) headers.set("content-type", mimeTypes[ext]);
        return new Response(file, { headers });
      }
    })
  : null;

if (!server) {
  console.error("This server entrypoint is intended for Bun in-cluster use.");
}
