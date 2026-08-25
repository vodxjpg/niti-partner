import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, extname } from "node:path";
const DIST = join(process.cwd(), "dist");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml" };
createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(req.url.split("?")[0]);
    if (p === "/") p = "/index.html";
    let fp = join(DIST, p);
    const s = await stat(fp).catch(() => null);
    if (s?.isDirectory()) fp = join(fp, "index.html");
    if (!extname(fp)) fp += ".html";
    const data = await readFile(fp);
    res.writeHead(200, { "content-type": TYPES[extname(fp)] || "application/octet-stream" });
    res.end(data);
  } catch { res.writeHead(404); res.end("not found"); }
}).listen(4173, () => console.log("dev server on http://localhost:4173"));