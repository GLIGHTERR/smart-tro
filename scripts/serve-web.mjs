import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";

const [directory = "dist", port = "4173"] = process.argv.slice(2);
const contentTypes = { ".css": "text/css", ".html": "text/html", ".js": "application/javascript", ".json": "application/json", ".svg": "image/svg+xml", ".ttf": "font/ttf", ".woff": "font/woff", ".woff2": "font/woff2" };

createServer((request, response) => {
  const path = new URL(request.url ?? "/", "http://localhost").pathname.replace(/^\/smart-tro(?=\/|$)/, "") || "/";
  const candidate = normalize(join(directory, path));
  if (path === "/") {
    const file = join(directory, "index.html");
    response.setHeader("Content-Type", contentTypes[extname(file)] ?? "application/octet-stream");
    createReadStream(file).pipe(response);
    return;
  }
  const isStaticAsset = candidate.startsWith(`${directory}/`) && existsSync(candidate) && statSync(candidate).isFile();
  // GitHub Pages serves 404.html for deep links, so use the same contract locally.
  const file = isStaticAsset ? candidate : join(directory, "404.html");
  if (!isStaticAsset) response.statusCode = 404;
  response.setHeader("Content-Type", contentTypes[extname(file)] ?? "application/octet-stream");
  createReadStream(file).pipe(response);
}).listen(Number(port), "127.0.0.1");
