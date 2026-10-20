"use strict";
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const slots = {
  STYLES: read("src/styles.css"),
  ENGINE: read("src/engine.js"),
  APP: read("src/app.js")
};
for (const key of ["ENGINE", "APP"]) {
  if (/<\/script/i.test(slots[key])) {
    throw new Error("Inline script terminator in " + key + "; escape it before bundling.");
  }
}
const result = read("src/index.template.html").replace(
  /\{\{(STYLES|ENGINE|APP)\}\}/g, (_, key) => slots[key]
);
fs.writeFileSync(path.join(root, "index.html"), result, "utf8");
console.log("Built index.html. Double-click it to run offline.");
