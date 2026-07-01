import { createServer } from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { join, extname } from "node:path";
import { Readable } from "node:stream";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

const { default: handler } = await import("./dist/server/server.js");

const port = parseInt(process.env.PORT ?? "3000", 10);

const MIME = {
  ".js": "application/javascript",
  ".mjs": "application/javascript",
  ".css": "text/css",
  ".html": "text/html",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".webp": "image/webp",
};

createServer(async (req, res) => {
  const urlPath = new URL(req.url ?? "/", "http://localhost").pathname;

  // Serve static files from dist/client
  const staticFile = join(__dirname, "dist/client", urlPath);
  if (existsSync(staticFile) && statSync(staticFile).isFile()) {
    const ext = extname(staticFile).toLowerCase();
    const mime = MIME[ext] ?? "application/octet-stream";
    const stat = statSync(staticFile);
    res.writeHead(200, {
      "Content-Type": mime,
      "Content-Length": stat.size,
      "Cache-Control": urlPath.startsWith("/assets/")
        ? "public, max-age=31536000, immutable"
        : "public, max-age=0, must-revalidate",
    });
    createReadStream(staticFile).pipe(res);
    return;
  }

  // SSR handler for everything else
  const host = req.headers.host ?? "localhost";
  const url = new URL(req.url ?? "/", `http://${host}`);

  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) {
    if (v != null) headers.set(k, Array.isArray(v) ? v.join(", ") : v);
  }

  let body = undefined;
  if (req.method !== "GET" && req.method !== "HEAD") {
    body = await new Promise((resolve, reject) => {
      const chunks = [];
      req.on("data", (c) => chunks.push(c));
      req.on("end", () => resolve(Buffer.concat(chunks)));
      req.on("error", reject);
    });
  }

  const request = new Request(url.toString(), {
    method: req.method,
    headers,
    body: body?.length ? body : undefined,
    duplex: "half",
  });

  const response = await handler.fetch(request, {}, {});

  const outHeaders = {};
  response.headers.forEach((v, k) => { outHeaders[k] = v; });
  res.writeHead(response.status, outHeaders);

  if (response.body) {
    Readable.fromWeb(response.body).pipe(res);
  } else {
    res.end();
  }
}).listen(port, () => {
  console.log(`Berry Sync listening on port ${port}`);
});
