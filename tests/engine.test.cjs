"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { createEngine } = require("../src/engine.js");
// Deterministic widths isolate geometry and rule logic.
// Run the in-browser self-test as well for real Canvas font measurement.
const engine = createEngine((text, size) =>
  Array.from(text).reduce((width, char) => width + (char === " " ? .28 : .55) * size, 0)
);
const kit = {name:"APEX",color:"#DFFF00",safe:.055,minFont:42,maxFont:92,maxLines:3};
const copy = {headline:"GO BEYOND\nTHE ORDINARY.",body:"Every journey deserves a different perspective.",cta:"Discover more",price:"€399"};
const make = (format="feed", assets={}, override={}) => engine.build(kit,copy,"en",format,assets,override);
const check = (doc,id) => engine.check(doc,kit).find(item=>item.id===id).status;

test("all default formats satisfy hard rules", () => {
  for (const format of Object.keys(engine.formats)) {
    assert.equal(engine.check(make(format),kit).some(item=>item.status==="fail"),false,format);
  }
});
test("stretched product is rejected", () => {
  const doc=make(); doc.nodes.find(n=>n.id==="product").w*=1.3;
  assert.equal(check(doc,"product.ratio"),"fail");
});
test("wrong title color is rejected", () => {
  const doc=make(); doc.nodes.find(n=>n.id==="headline").color="#FF00FF";
  assert.equal(check(doc,"brand.color"),"fail");
});
test("unsafe logo position is rejected", () => {
  const doc=make(); doc.nodes.find(n=>n.id==="logo").x=-20;
  assert.equal(check(doc,"layout.safe"),"fail");
});
test("rendered price tampering is rejected", () => {
  const doc=make(); doc.nodes.find(n=>n.id==="price").lines=["€199"];
  assert.equal(check(doc,"copy.exact"),"fail");
});
test("long copy stays intact and fails visibly", () => {
  const title=("A VERY LONG HEADLINE ").repeat(60);
  const doc=engine.build(kit,{...copy,headline:title},"en","feed",{});
  assert.equal(doc.nodes.find(n=>n.id==="headline").text,title);
  assert.equal(check(doc,"type.limits"),"fail");
});
test("saved correction is reused on regeneration", () => {
  const original=make(), modified=make("feed",{},{dx:31,font:68});
  assert.equal(modified.nodes.find(n=>n.id==="headline").x,original.nodes.find(n=>n.id==="headline").x+31);
  assert.equal(modified.nodes.find(n=>n.id==="headline").size,68);
});
test("wide uploaded logo is contained", () => {
  const doc=make("feed",{logo:{ratio:40,src:"data:image/png;base64,AA=="}});
  assert.equal(check(doc,"logo.ratio"),"pass");
  assert.equal(check(doc,"layout.safe"),"pass");
});
test("different product proportions remain correct", () => {
  for (const ratio of [.5,1,3]) {
    const doc=make("feed",{product:{ratio,src:"data:image/png;base64,AA=="}});
    assert.equal(check(doc,"product.ratio"),"pass");
  }
});
test("visual judgment always needs a human by default", () => {
  assert.equal(check(make(),"visual.review"),"review");
});
test("manual line breaks preserve all words", () => {
  const lines=engine.wrap("KEEP\nTHE ORIGINAL WORDS",48,300);
  assert.equal(lines.join("").replace(/\s/g,""),"KEEPTHEORIGINALWORDS");
});
