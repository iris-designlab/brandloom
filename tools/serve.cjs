"use strict";
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const port = Number(process.env.PORT || 4173);
const types = {".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8",".md":"text/plain; charset=utf-8",".svg":"image/svg+xml"};
const server = http.createServer((request, response) => {
  try {
    const url = new URL(request.url, "http://127.0.0.1");
    const pathname = decodeURIComponent(url.pathname);
    const file = path.resolve(root, "." + (pathname === "/" ? "/index.html" : pathname));
    const relative = path.relative(root, file);
    if (relative.startsWith("..") || path.isAbsolute(relative) || relative.split(path.sep).some(part=>part.startsWith("."))) {
      response.writeHead(403).end("Forbidden"); return;
    }
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
      response.writeHead(404).end("Not found"); return;
    }
    response.writeHead(200, {"Content-Type":types[path.extname(file)] || "application/octet-stream","Cache-Control":"no-store"});
    fs.createReadStream(file).pipe(response);
  } catch {
    response.writeHead(400).end("Bad request");
  }
});
server.on("error", error => { console.error(error.message); process.exitCode = 1; });
server.listen(port, "127.0.0.1", () => console.log("Brandloom: http://127.0.0.1:" + port));
