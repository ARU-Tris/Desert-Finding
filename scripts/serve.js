import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".png": "image/png",
  ".json": "application/json",
};
http
  .createServer(async (req, res) => {
    try {
      let requested = decodeURIComponent(
        new URL(req.url, "http://localhost").pathname,
      );
      // Also serve under the Pages project prefix for subpath acceptance tests.
      if (requested.startsWith("/Desert-Finding/"))
        requested = requested.slice("/Desert-Finding".length);
      if (requested.endsWith("/")) requested += "index.html";
      const target = path.resolve(root, "." + requested);
      if (!target.startsWith(root)) {
        res.writeHead(403);
        res.end();
        return;
      }
      const body = await readFile(target);
      res.writeHead(200, {
        "Content-Type":
          types[path.extname(target)] ?? "application/octet-stream",
        "Cache-Control": "no-store",
      });
      res.end(body);
    } catch {
      res.writeHead(404);
      res.end("Not found");
    }
  })
  .listen(Number(process.env.PORT ?? 8000), "127.0.0.1", () =>
    console.log("Desert Finding: http://127.0.0.1:8000"),
  );
